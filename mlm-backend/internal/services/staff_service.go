package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/models"
)

// StaffService panel çalışanlarını (role='staff') ve menü izinlerini yönetir.
type StaffService struct {
	db    *pgxpool.Pool
	users *UserService
}

func NewStaffService(db *pgxpool.Pool, users *UserService) *StaffService {
	return &StaffService{db: db, users: users}
}

// StaffWithMenus çalışan + menü izinleri.
type StaffWithMenus struct {
	User  models.User
	Menus []string
}

// List çalışanları ve menü izinlerini döndürür.
func (s *StaffService) List(ctx context.Context) ([]StaffWithMenus, error) {
	rows, err := s.db.Query(ctx, `SELECT `+userColumns+` FROM users WHERE role = 'staff' ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("çalışanlar listelenemedi: %w", err)
	}
	defer rows.Close()

	staff := make([]StaffWithMenus, 0)
	index := map[int64]int{}
	for rows.Next() {
		u, err := scanUserRow(rows)
		if err != nil {
			return nil, err
		}
		index[u.ID] = len(staff)
		staff = append(staff, StaffWithMenus{User: *u, Menus: []string{}})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	prows, err := s.db.Query(ctx, `SELECT user_id, menu_key FROM staff_permissions ORDER BY menu_key`)
	if err != nil {
		return staff, nil // izin tablosu henüz oluşmamış olabilir
	}
	defer prows.Close()
	for prows.Next() {
		var uid int64
		var key string
		if err := prows.Scan(&uid, &key); err == nil {
			if i, ok := index[uid]; ok {
				staff[i].Menus = append(staff[i].Menus, key)
			}
		}
	}
	return staff, nil
}

// Create yeni çalışan oluşturur (role='staff').
func (s *StaffService) Create(ctx context.Context, name, email, phone, password string) (*models.User, error) {
	name = strings.TrimSpace(name)
	email = strings.ToLower(strings.TrimSpace(email))
	phone = strings.TrimSpace(phone)
	if name == "" || email == "" {
		return nil, errors.New("ad ve e-posta zorunludur")
	}
	if err := auth.ValidatePassword(password); err != nil {
		return nil, err
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("şifre hash'lenemedi: %w", err)
	}
	memberCode, err := s.users.GenerateMemberCode(ctx)
	if err != nil {
		return nil, err
	}

	var id int64
	err = s.db.QueryRow(ctx, `
		INSERT INTO users (name, email, phone, member_code, role, password_hash, is_active, is_in_pending_pool)
		VALUES ($1, $2, NULLIF($3, ''), $4, 'staff', $5, true, false)
		RETURNING id`,
		name, email, phone, memberCode, hash,
	).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			return nil, ErrEmailExists
		}
		return nil, fmt.Errorf("çalışan oluşturulamadı: %w", err)
	}
	return s.users.GetUserByID(ctx, id)
}

// UpdateInfo çalışanın ad/e-posta/telefon alanlarını günceller.
func (s *StaffService) UpdateInfo(ctx context.Context, userID int64, name, email, phone string) error {
	name = strings.TrimSpace(name)
	email = strings.ToLower(strings.TrimSpace(email))
	phone = strings.TrimSpace(phone)
	if name == "" || email == "" {
		return errors.New("ad ve e-posta zorunludur")
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET name=$1, email=$2, phone=NULLIF($3,''), updated_at=NOW() WHERE id=$4 AND role='staff'`,
		name, email, phone, userID)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			return ErrEmailExists
		}
		return fmt.Errorf("çalışan güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdatePassword çalışanın şifresini değiştirir.
func (s *StaffService) UpdatePassword(ctx context.Context, userID int64, password string) error {
	if err := auth.ValidatePassword(password); err != nil {
		return err
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("şifre hash'lenemedi: %w", err)
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2 AND role='staff'`,
		hash, userID)
	if err != nil {
		return fmt.Errorf("şifre güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// SetMenus çalışanın menü izinlerini toptan yazar (önce siler, sonra ekler).
func (s *StaffService) SetMenus(ctx context.Context, userID int64, menus []string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var role string
	if err := tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, userID).Scan(&role); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return err
	}
	if role != "staff" {
		return ErrUserNotFound
	}

	if _, err := tx.Exec(ctx, `DELETE FROM staff_permissions WHERE user_id=$1`, userID); err != nil {
		return err
	}
	for _, m := range menus {
		m = strings.TrimSpace(m)
		if m == "" || len(m) > 120 {
			continue
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO staff_permissions (user_id, menu_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			userID, m); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Delete çalışanı siler; bağlı kayıt varsa pasife alır.
// Dönen bool: gerçekten silindi mi (false ise pasife alındı).
func (s *StaffService) Delete(ctx context.Context, userID int64) (bool, error) {
	tag, err := s.db.Exec(ctx, `DELETE FROM users WHERE id=$1 AND role='staff'`, userID)
	if err == nil {
		if tag.RowsAffected() == 0 {
			return false, ErrUserNotFound
		}
		return true, nil
	}

	// FK kısıtı vb. → hesabı pasife al (veri kaybı olmasın).
	utag, uerr := s.db.Exec(ctx,
		`UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1 AND role='staff'`, userID)
	if uerr != nil {
		return false, fmt.Errorf("çalışan silinemedi: %w", err)
	}
	if utag.RowsAffected() == 0 {
		return false, ErrUserNotFound
	}
	return false, nil
}

// MenusFor kullanıcının menü izin anahtarlarını döndürür.
func (s *StaffService) MenusFor(ctx context.Context, userID int64) ([]string, error) {
	rows, err := s.db.Query(ctx, `SELECT menu_key FROM staff_permissions WHERE user_id=$1 ORDER BY menu_key`, userID)
	if err != nil {
		return []string{}, nil
	}
	defer rows.Close()
	menus := make([]string, 0)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err == nil {
			menus = append(menus, key)
		}
	}
	return menus, nil
}
