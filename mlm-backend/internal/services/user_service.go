package services

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/models"
)

// Servis katmanındaki bilinen hatalar.
var (
	ErrEmailExists     = errors.New("bu e-posta adresi zaten kayıtlı")
	ErrPhoneExists     = errors.New("bu telefon numarası zaten kayıtlı")
	ErrUserNotFound    = errors.New("kullanıcı bulunamadı")
	ErrSponsorNotFound = errors.New("sponsor bulunamadı")
	ErrWrongPassword   = errors.New("mevcut şifre hatalı")
)

// UserService kullanıcı işlemlerini yürüten servistir.
type UserService struct {
	db *pgxpool.Pool
}

// NewUserService yeni bir UserService örneği döndürür.
func NewUserService(db *pgxpool.Pool) *UserService {
	return &UserService{db: db}
}

// userColumns GetUser* sorgularında kullanılan ortak kolon listesidir.
const userColumns = `id, name, email, phone, member_code, role, password_hash, sponsor_id, parent_id,
	position, package_id, is_active, is_in_pending_pool, pending_since, current_rank_id,
	total_pv_left, total_pv_right, total_cv_left, total_cv_right, total_pv_accumulated, total_cv_accumulated,
	current_month_binary_earned, created_at, updated_at`

// GenerateMemberCode TR90 + 6 rastgele haneden oluşan, veritabanında benzersiz
// bir üye kodu üretir. Çakışma olursa yeni kod üretir (en fazla 20 deneme).
func (s *UserService) GenerateMemberCode(ctx context.Context) (string, error) {
	for attempt := 0; attempt < 20; attempt++ {
		code, err := randomMemberCode()
		if err != nil {
			return "", fmt.Errorf("üye kodu üretilemedi: %w", err)
		}

		var exists bool
		err = s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE member_code = $1)", code).Scan(&exists)
		if err != nil {
			return "", fmt.Errorf("üye kodu kontrolü başarısız: %w", err)
		}

		if !exists {
			return code, nil
		}
	}

	return "", errors.New("benzersiz üye kodu üretilemedi")
}

// randomMemberCode crypto/rand ile TR90 + 6 rastgele hane üretir.
func randomMemberCode() (string, error) {
	var sb strings.Builder
	sb.WriteString("TR90")
	for i := 0; i < 6; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		sb.WriteString(n.String())
	}
	return sb.String(), nil
}

// CreateUser yeni kullanıcıyı transaction içinde oluşturur:
// users kaydı + (üye ise) pending_pool kaydı + cüzdan kaydı.
// role: 'user' (girişimci) veya 'customer' (müşteri). Müşteriler binary
// ağaca girmez (is_in_pending_pool = false) ve sponsor zorunludur.
func (s *UserService) CreateUser(ctx context.Context, name, email, password, phone string, sponsorID *int64, role string, profile map[string]any) (*models.User, error) {
	name = strings.TrimSpace(name)
	email = strings.ToLower(strings.TrimSpace(email))
	phone = strings.TrimSpace(phone)
	role = strings.ToLower(strings.TrimSpace(role))
	if role == "" {
		role = "user"
	}
	if role != "user" && role != "customer" {
		return nil, errors.New("geçersiz rol: 'user' veya 'customer' olmalıdır")
	}

	if name == "" || email == "" || password == "" {
		return nil, errors.New("ad, e-posta ve şifre zorunludur")
	}
	if err := auth.ValidatePassword(password); err != nil {
		return nil, err
	}

	// Müşteri kaydı için sponsor zorunlu
	if role == "customer" && sponsorID == nil {
		return nil, errors.New("müşteri kaydı için sponsor zorunludur")
	}

	// E-posta benzersizlik kontrolü
	var emailExists bool
	if err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&emailExists); err != nil {
		return nil, fmt.Errorf("e-posta kontrolü başarısız: %w", err)
	}
	if emailExists {
		return nil, ErrEmailExists
	}

	// Telefon benzersizlik kontrolü
	if phone != "" {
		var phoneExists bool
		if err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)", phone).Scan(&phoneExists); err != nil {
			return nil, fmt.Errorf("telefon kontrolü başarısız: %w", err)
		}
		if phoneExists {
			return nil, ErrPhoneExists
		}
	}

	// Sponsor verilmişse varlığını doğrula
	if sponsorID != nil {
		var sponsorExists bool
		if err := s.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", *sponsorID).Scan(&sponsorExists); err != nil {
			return nil, fmt.Errorf("sponsor kontrolü başarısız: %w", err)
		}
		if !sponsorExists {
			return nil, ErrSponsorNotFound
		}
	}

	// Şifreyi hash'le
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("şifre hash'lenemedi: %w", err)
	}

	// Benzersiz üye kodu üret
	memberCode, err := s.GenerateMemberCode(ctx)
	if err != nil {
		return nil, err
	}

	// Transaction: users + (üye ise) pending_pool + wallets birlikte yazılır
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	now := time.Now()

	// İş kuralı: Alışveriş yapılmadan kişi yerleşim bekleyenlere düşmez.
	// Kayıtta havuzda değildir; ilk ödenen siparişte (ProcessOrderEffects) havuza eklenir.
	isInPendingPool := false
	var pendingSince *time.Time

	var userID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO users (name, email, phone, member_code, role, password_hash, sponsor_id,
			is_active, is_in_pending_pool, pending_since, total_pv_accumulated, total_cv_accumulated, profile)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, TRUE, $8, $9, 0, 0, $10)
		RETURNING id`,
		name, email, phone, memberCode, role, hash, sponsorID, isInPendingPool, pendingSince, profile,
	).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("kullanıcı eklenemedi: %w", err)
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn, chip_balance)
		VALUES ($1, 0, 0, 0, 0)`, userID); err != nil {
		return nil, fmt.Errorf("cüzdan oluşturulamadı: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{
		"user_id":     userID,
		"member_code": memberCode,
		"sponsor_id":  sponsorID,
		"role":        role,
	}).Info("Yeni kullanıcı oluşturuldu")

	var phonePtr *string
	if phone != "" {
		phonePtr = &phone
	}

	return &models.User{
		ID:              userID,
		Name:            name,
		Email:           email,
		Phone:           phonePtr,
		MemberCode:      memberCode,
		Role:            role,
		PasswordHash:    hash,
		SponsorID:       sponsorID,
		IsActive:        true,
		IsInPendingPool: isInPendingPool,
		PendingSince:    pendingSince,
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}

// GetUserByEmail e-posta adresine göre kullanıcıyı bulur.
func (s *UserService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	return s.getUser(ctx, "SELECT "+userColumns+" FROM users WHERE email = $1", email)
}

// GetUserByPhone telefon numarasına göre kullanıcıyı bulur.
func (s *UserService) GetUserByPhone(ctx context.Context, phone string) (*models.User, error) {
	phone = strings.TrimSpace(phone)
	return s.getUser(ctx, "SELECT "+userColumns+" FROM users WHERE phone = $1", phone)
}

// GetUserByMemberCode üye koduna göre kullanıcıyı bulur.
func (s *UserService) GetUserByMemberCode(ctx context.Context, code string) (*models.User, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	return s.getUser(ctx, "SELECT "+userColumns+" FROM users WHERE member_code = $1", code)
}

// GetUserByID ID'ye göre kullanıcıyı bulur.
func (s *UserService) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	return s.getUser(ctx, "SELECT "+userColumns+" FROM users WHERE id = $1", id)
}

// getUser ortak sorgu çalıştırıcısıdır; satırı models.User'a map eder.
func (s *UserService) getUser(ctx context.Context, query string, args ...interface{}) (*models.User, error) {
	u, err := scanUserRow(s.db.QueryRow(ctx, query, args...))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("kullanıcı sorgulanamadı: %w", err)
	}
	return u, nil
}

// scanUserRow userColumns sırasına göre tek satırı models.User'a dönüştürür.
func scanUserRow(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(
		&u.ID, &u.Name, &u.Email, &u.Phone, &u.MemberCode, &u.Role, &u.PasswordHash,
		&u.SponsorID, &u.ParentID, &u.Position, &u.PackageID,
		&u.IsActive, &u.IsInPendingPool, &u.PendingSince, &u.CurrentRankID,
		&u.TotalPVLeft, &u.TotalPVRight, &u.TotalCVLeft, &u.TotalCVRight,
		&u.TotalPVAccumulated, &u.TotalCVAccumulated, &u.CurrentMonthBinaryEarned, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateUser verilen kullanıcının değişebilir alanlarını günceller.
func (s *UserService) UpdateUser(ctx context.Context, u *models.User) error {
	_, err := s.db.Exec(ctx, `
		UPDATE users SET
			name = $1, email = $2, role = $3, sponsor_id = $4, parent_id = $5, position = $6,
			package_id = $7, is_active = $8, is_in_pending_pool = $9,
			current_rank_id = $10, total_pv_left = $11, total_pv_right = $12,
			total_cv_left = $13, total_cv_right = $14, total_pv_accumulated = $15,
			total_cv_accumulated = $16, current_month_binary_earned = $17, updated_at = NOW()
		WHERE id = $18`,
		u.Name, u.Email, u.Role, u.SponsorID, u.ParentID, u.Position, u.PackageID,
		u.IsActive, u.IsInPendingPool, u.CurrentRankID,
		u.TotalPVLeft, u.TotalPVRight, u.TotalCVLeft, u.TotalCVRight,
		u.TotalPVAccumulated, u.TotalCVAccumulated, u.CurrentMonthBinaryEarned, u.ID,
	)
	if err != nil {
		return fmt.Errorf("kullanıcı güncellenemedi: %w", err)
	}
	return nil
}

// ChangePassword eski şifreyi doğrulayıp yeni şifreyi bcrypt ile kaydeder.
func (s *UserService) ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	if err := auth.ValidatePassword(newPassword); err != nil {
		return err
	}

	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if !auth.CheckPassword(oldPassword, user.PasswordHash) {
		return ErrWrongPassword
	}

	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("şifre hash'lenemedi: %w", err)
	}

	if _, err := s.db.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, hash, userID); err != nil {
		return fmt.Errorf("şifre güncellenemedi: %w", err)
	}

	log.WithField("user_id", userID).Info("Şifre değiştirildi")
	return nil
}

// ListSponsoredUsers kullanıcının sponsor olduğu üyeleri döndürür.
func (s *UserService) ListSponsoredUsers(ctx context.Context, userID int64) ([]models.User, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+userColumns+` FROM users WHERE sponsor_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("sponsor olunanlar listelenemedi: %w", err)
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		u, err := scanUserRow(rows)
		if err != nil {
			return nil, fmt.Errorf("kullanıcı okunamadı: %w", err)
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

// GetCareerProgress kullanıcının rütbe ilerleme geçmişini döndürür.
func (s *UserService) GetCareerProgress(ctx context.Context, userID int64) ([]models.CareerProgress, error) {
	rows, err := s.db.Query(ctx,
		`SELECT rp.rank_id, r.name, rp.achieved_at, rp.is_active
		 FROM rank_progress rp
		 JOIN ranks r ON r.id = rp.rank_id
		 WHERE rp.user_id = $1
		 ORDER BY rp.achieved_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("kariyer geçmişi listelenemedi: %w", err)
	}
	defer rows.Close()

	items := make([]models.CareerProgress, 0)
	for rows.Next() {
		var c models.CareerProgress
		if err := rows.Scan(&c.RankID, &c.RankName, &c.AchievedAt, &c.IsActive); err != nil {
			return nil, fmt.Errorf("kariyer kaydı okunamadı: %w", err)
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

// GetProfile kullanıcının profile (JSONB) alanını map olarak döndürür.
func (s *UserService) GetProfile(ctx context.Context, userID int64) (map[string]any, error) {
	var raw []byte
	err := s.db.QueryRow(ctx, `SELECT COALESCE(profile, '{}'::jsonb) FROM users WHERE id = $1`, userID).Scan(&raw)
	if err != nil {
		return nil, fmt.Errorf("profil okunamadı: %w", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, fmt.Errorf("profil çözümlenemedi: %w", err)
	}
	return m, nil
}

// SetProfileImage kullanıcının profil görselini günceller.
func (s *UserService) SetProfileImage(ctx context.Context, userID int64, imagePath string) error {
	if _, err := s.db.Exec(ctx,
		`UPDATE users SET profile = jsonb_set(COALESCE(profile, '{}'::jsonb), '{profile_image}', to_jsonb($2::text)) WHERE id = $1`,
		userID, imagePath); err != nil {
		return fmt.Errorf("profil görseli güncellenemedi: %w", err)
	}
	return nil
}

// SetThemeColor kullanıcının tema rengini profil alanına kaydeder.
func (s *UserService) SetThemeColor(ctx context.Context, userID int64, color string) error {
	if _, err := s.db.Exec(ctx,
		`UPDATE users SET profile = jsonb_set(COALESCE(profile, '{}'::jsonb), '{theme_color}', to_jsonb($2::text)) WHERE id = $1`,
		userID, color); err != nil {
		return fmt.Errorf("tema rengi kaydedilemedi: %w", err)
	}
	return nil
}

// ErrResetTokenInvalid tek kullanımlık sıfırlama kodunun geçersiz/süresi dolmuş olduğunu belirtir.
var ErrResetTokenInvalid = errors.New("sıfırlama kodu geçersiz veya süresi dolmuş")

// StorePasswordReset geçerli kullanıcı için tek kullanımlık sıfırlama kodunu (hash'li)
// ve süresini kaydeder. Süre saniye cinsindendir (varsayılan 900 = 15 dk).
func (s *UserService) StorePasswordReset(ctx context.Context, userID int64, codeHash string, ttlSeconds int64) error {
	expires := time.Now().UTC().Add(time.Duration(ttlSeconds) * time.Second)
	if _, err := s.db.Exec(ctx,
		`UPDATE users SET password_reset_token = $2, password_reset_expires = $3, updated_at = NOW() WHERE id = $1`,
		userID, codeHash, expires); err != nil {
		return fmt.Errorf("sıfırlama kodu kaydedilemedi: %w", err)
	}
	return nil
}

// ResetPasswordWithCode tek kullanımlık kodu doğrular ve yeni şifreyi kaydeder.
// Kod doğruysa token temizlenir; geçersiz/süresi dolmuşsa ErrResetTokenInvalid döner.
func (s *UserService) ResetPasswordWithCode(ctx context.Context, login, code, newPassword string) error {
	if err := auth.ValidatePassword(newPassword); err != nil {
		return err
	}

	var (
		userID        int64
		storedHash    *string
		storedExpires *time.Time
	)
	err := s.db.QueryRow(ctx,
		`SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = $1 OR member_code = $2 OR phone = $3`,
		strings.ToLower(strings.TrimSpace(login)),
		strings.ToUpper(strings.TrimSpace(login)),
		strings.TrimSpace(login),
	).Scan(&userID, &storedHash, &storedExpires)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("kullanıcı aranamadı: %w", err)
	}

	if storedHash == nil || storedExpires == nil || time.Now().UTC().After(*storedExpires) {
		return ErrResetTokenInvalid
	}
	if !auth.CheckPassword(code, *storedHash) {
		return ErrResetTokenInvalid
	}

	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("şifre hash'lenemedi: %w", err)
	}

	if _, err := s.db.Exec(ctx,
		`UPDATE users SET password_hash = $2, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $1`,
		userID, hash); err != nil {
		return fmt.Errorf("şifre güncellenemedi: %w", err)
	}

	log.WithField("user_id", userID).Info("Şifre sıfırlama koduyla değiştirildi")
	return nil
}
