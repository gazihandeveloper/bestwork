package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// Bekleyenler havuzu işlemlerine özel hatalar.
var (
	ErrInvalidPosition           = errors.New("pozisyon 'L' veya 'R' olmalıdır")
	ErrPoolEntryNotFound         = errors.New("bu kullanıcı için bekleyen havuz kaydı bulunamadı")
	ErrUserAlreadyPlaced         = errors.New("kullanıcı zaten ağaca yerleştirilmiş")
	ErrPositionOccupied          = errors.New("seçilen binary bacak dolu")
	ErrInvalidPlacement          = errors.New("yerleştirme binary ağaçta döngü oluşturur")
	ErrInactiveUser              = errors.New("pasif kullanıcı ağaca yerleştirilemez")
	ErrPlacementRequiresPurchase = errors.New("ağaca yerleştirme için önce alışveriş yapılmalıdır")
)

// PendingPoolEntry bekleyen havuz kaydını kullanıcı ve sponsor bilgisiyle tutar.
type PendingPoolEntry struct {
	User              models.User `json:"user"`
	SponsorID         *int64      `json:"sponsor_id"`
	SponsorName       *string     `json:"sponsor_name"`
	SponsorMemberCode *string     `json:"sponsor_member_code"`
}

// PendingPoolService bekleyenler havuzu ve ağaca yerleştirme işlemlerini yürütür.
type PendingPoolService struct {
	db *pgxpool.Pool
}

// NewPendingPoolService yeni bir PendingPoolService örneği döndürür.
func NewPendingPoolService(db *pgxpool.Pool) *PendingPoolService {
	return &PendingPoolService{db: db}
}

// ListPendingUsersBySponsor sponsorun henüz yerleştirilmemiş bekleyenlerini döndürür.
func (s *PendingPoolService) ListPendingUsersBySponsor(ctx context.Context, sponsorID int64) ([]models.User, error) {
	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.email, u.phone, u.member_code, u.role, u.password_hash, u.sponsor_id, u.parent_id,
			u.position, u.package_id, u.is_active, u.is_in_pending_pool, u.pending_since, u.current_rank_id,
			u.total_pv_left, u.total_pv_right, u.total_cv_left, u.total_cv_right,
			u.total_pv_accumulated, u.total_cv_accumulated,
			u.current_month_binary_earned, u.created_at, u.updated_at
		FROM pending_pool pp
		JOIN users u ON u.id = pp.user_id
		WHERE pp.sponsor_id = $1 AND pp.is_placed = false
		ORDER BY pp.id ASC`, sponsorID)
	if err != nil {
		return nil, fmt.Errorf("bekleyenler listelenemedi: %w", err)
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		u, err := scanUserRow(rows)
		if err != nil {
			return nil, fmt.Errorf("bekleyen kullanıcı okunamadı: %w", err)
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

// ListAllPendingUsers tüm yerleştirilmemiş bekleyenleri sponsor bilgisiyle döndürür (admin).
func (s *PendingPoolService) ListAllPendingUsers(ctx context.Context) ([]PendingPoolEntry, error) {
	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.name, u.email, u.phone, u.member_code, u.role, u.password_hash, u.sponsor_id, u.parent_id,
			u.position, u.package_id, u.is_active, u.is_in_pending_pool, u.pending_since, u.current_rank_id,
			u.total_pv_left, u.total_pv_right, u.total_cv_left, u.total_cv_right,
			u.total_pv_accumulated, u.total_cv_accumulated,
			u.current_month_binary_earned, u.created_at, u.updated_at,
			s.id, s.name, s.member_code
		FROM pending_pool pp
		JOIN users u ON u.id = pp.user_id
		LEFT JOIN users s ON s.id = pp.sponsor_id
		WHERE pp.is_placed = false AND u.is_in_pending_pool = true
		ORDER BY pp.id ASC`)
	if err != nil {
		return nil, fmt.Errorf("bekleyenler listelenemedi: %w", err)
	}
	defer rows.Close()

	entries := make([]PendingPoolEntry, 0)
	for rows.Next() {
		var u models.User
		var sponsorID *int64
		var sponsorName, sponsorCode *string

		if err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.MemberCode, &u.Role, &u.PasswordHash,
			&u.SponsorID, &u.ParentID, &u.Position, &u.PackageID,
			&u.IsActive, &u.IsInPendingPool, &u.PendingSince, &u.CurrentRankID,
			&u.TotalPVLeft, &u.TotalPVRight, &u.TotalCVLeft, &u.TotalCVRight,
			&u.TotalPVAccumulated, &u.TotalCVAccumulated, &u.CurrentMonthBinaryEarned, &u.CreatedAt, &u.UpdatedAt,
			&sponsorID, &sponsorName, &sponsorCode,
		); err != nil {
			return nil, fmt.Errorf("bekleyen kaydı okunamadı: %w", err)
		}

		entries = append(entries, PendingPoolEntry{
			User:              u,
			SponsorID:         sponsorID,
			SponsorName:       sponsorName,
			SponsorMemberCode: sponsorCode,
		})
	}
	return entries, rows.Err()
}

// PlaceUser sponsorun bekleyen bir kullanıcısını binary ağaca yerleştirir.
func (s *PendingPoolService) PlaceUser(ctx context.Context, sponsorID int64, userID int64, position string) error {
	position = strings.ToUpper(strings.TrimSpace(position))
	if position != "L" && position != "R" {
		return ErrInvalidPosition
	}

	// Kullanıcıyı doğrula
	if err := s.validatePendingUser(ctx, userID); err != nil {
		return err
	}

	// Sponsoru doğrula
	if err := s.validateSponsorExists(ctx, sponsorID); err != nil {
		return err
	}

	// Bekleyen havuz kaydını kontrol et (sponsor + kullanıcı eşleşmesi)
	var poolID int64
	err := s.db.QueryRow(ctx,
		`SELECT id FROM pending_pool WHERE user_id = $1 AND sponsor_id = $2 AND is_placed = false`,
		userID, sponsorID).Scan(&poolID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPoolEntryNotFound
	}
	if err != nil {
		return fmt.Errorf("havuz kaydı sorgulanamadı: %w", err)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := placeUserInTx(ctx, tx, poolID, sponsorID, sponsorID, userID, position); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	return nil
}

// PlaceUserByAdmin bekleyen bir kullanıcıyı admin tarafından seçilen herhangi
// bir kullanıcının altına yerleştirir (sponsor eşleşmesi aranmaz).
func (s *PendingPoolService) PlaceUserByAdmin(ctx context.Context, sponsorID int64, userID int64, position string) error {
	position = strings.ToUpper(strings.TrimSpace(position))
	if position != "L" && position != "R" {
		return ErrInvalidPosition
	}

	// Kullanıcıyı doğrula
	if err := s.validatePendingUser(ctx, userID); err != nil {
		return err
	}

	// Hedef sponsorun var olduğunu doğrula
	if err := s.validateSponsorExists(ctx, sponsorID); err != nil {
		return err
	}

	// Kullanıcının herhangi bir bekleyen havuz kaydını bul
	var poolID int64
	err := s.db.QueryRow(ctx,
		`SELECT id FROM pending_pool WHERE user_id = $1 AND is_placed = false ORDER BY id LIMIT 1`,
		userID).Scan(&poolID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPoolEntryNotFound
	}
	if err != nil {
		return fmt.Errorf("havuz kaydı sorgulanamadı: %w", err)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := placeUserInTx(ctx, tx, poolID, sponsorID, sponsorID, userID, position); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	return nil
}

// validatePendingUser kullanıcının var olduğunu ve hâlâ beklediğini doğrular.
func (s *PendingPoolService) validatePendingUser(ctx context.Context, userID int64) error {
	var isInPendingPool bool
	err := s.db.QueryRow(ctx, `SELECT is_in_pending_pool FROM users WHERE id = $1`, userID).Scan(&isInPendingPool)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("kullanıcı sorgulanamadı: %w", err)
	}
	if !isInPendingPool {
		return ErrUserAlreadyPlaced
	}
	return nil
}

// validateSponsorExists hedef sponsorun var olduğunu doğrular.
func (s *PendingPoolService) validateSponsorExists(ctx context.Context, sponsorID int64) error {
	var sponsorExists bool
	if err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, sponsorID).Scan(&sponsorExists); err != nil {
		return fmt.Errorf("sponsor kontrolü başarısız: %w", err)
	}
	if !sponsorExists {
		return ErrSponsorNotFound
	}
	return nil
}

// placeUserInTx yerleştirme işleminin transaction gövdesini yürütür:
// kullanıcı güncelleme + havuz kaydı + PV/CV üst hat dağıtımı.
func placeUserInTx(ctx context.Context, tx DBTX, poolID, sponsorID, parentID, userID int64, position string) error {
	if sponsorID == userID {
		return ErrInvalidPlacement
	}

	// İş kuralı: Alışveriş (ödenmiş sipariş) yapılmadan kullanıcı hiçbir şekilde
	// ağaca yerleştirilemez (sponsor, admin veya kodla yerleştirme dahil).
	var hasPaidOrder bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM orders WHERE user_id = $1 AND status = 'paid')`, userID).
		Scan(&hasPaidOrder); err != nil {
		return fmt.Errorf("sipariş kontrolü yapılamadı: %w", err)
	}
	if !hasPaidOrder {
		return ErrPlacementRequiresPurchase
	}

	var userPending, userActive bool
	var currentParent *int64
	if err := tx.QueryRow(ctx,
		`SELECT is_in_pending_pool, is_active, parent_id FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&userPending, &userActive, &currentParent); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("kullanıcı sorgulanamadı: %w", err)
	}
	if !userPending || currentParent != nil {
		return ErrUserAlreadyPlaced
	}
	if !userActive {
		return ErrInactiveUser
	}

	var parentActive bool
	if err := tx.QueryRow(ctx, `SELECT is_active FROM users WHERE id = $1 FOR UPDATE`, parentID).Scan(&parentActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSponsorNotFound
		}
		return fmt.Errorf("hedef üye sorgulanamadı: %w", err)
	}
	if !parentActive {
		return ErrInactiveUser
	}

	var createsCycle bool
	if err := tx.QueryRow(ctx, `
		WITH RECURSIVE descendants(id) AS (
			SELECT id FROM users WHERE parent_id = $1
			UNION
			SELECT u.id FROM users u JOIN descendants d ON u.parent_id = d.id
		)
		SELECT EXISTS(SELECT 1 FROM descendants WHERE id = $2)`, userID, parentID).
		Scan(&createsCycle); err != nil {
		return fmt.Errorf("ağaç döngüsü kontrol edilemedi: %w", err)
	}
	if createsCycle {
		return ErrInvalidPlacement
	}

	var positionOccupied bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE parent_id = $1 AND position = $2)`, parentID, position).
		Scan(&positionOccupied); err != nil {
		return fmt.Errorf("binary bacak kontrol edilemedi: %w", err)
	}
	if positionOccupied {
		return ErrPositionOccupied
	}

	userTag, err := tx.Exec(ctx,
		`UPDATE users SET parent_id = $1, position = $2, is_in_pending_pool = false, updated_at = NOW()
		 WHERE id = $3 AND is_in_pending_pool = true AND parent_id IS NULL`,
		parentID, position, userID)
	if err != nil {
		return fmt.Errorf("kullanıcı ağaca yerleştirilemedi: %w", err)
	}
	if userTag.RowsAffected() != 1 {
		return ErrUserAlreadyPlaced
	}

	poolTag, err := tx.Exec(ctx,
		`UPDATE pending_pool SET is_placed = true, placed_at = NOW(), placed_under_id = $1, placed_position = $2
		 WHERE id = $3 AND is_placed = false`, parentID, position, poolID)
	if err != nil {
		return fmt.Errorf("havuz kaydı güncellenemedi: %w", err)
	}
	if poolTag.RowsAffected() != 1 {
		return ErrPoolEntryNotFound
	}

	// Kullanıcının birikmiş PV ve CV toplamlarını al
	var totalPV, totalCV int64
	if err := tx.QueryRow(ctx,
		`SELECT total_pv_accumulated, total_cv_accumulated FROM users WHERE id = $1`, userID).Scan(&totalPV, &totalCV); err != nil {
		return fmt.Errorf("PV/CV toplamları okunamadı: %w", err)
	}

	// Üst hatta PV/CV dağıt (binary eşleşme aylık kapanışta toplu yapılır)
	if err := ProcessPlacementForBinary(ctx, tx, userID, totalPV, totalCV, position); err != nil {
		return err
	}

	log.WithFields(log.Fields{
		"user_id":    userID,
		"sponsor_id": sponsorID,
		"position":   position,
		"total_pv":   totalPV,
		"total_cv":   totalCV,
	}).Info("Kullanıcı ağaca yerleştirildi, üst hat güncellendi")

	return nil
}

// PlaceUserUnderByCode bekleyen bir üyeyi, üye koduyla (referans kodu) ve
// kullanıcının kendi ağacındaki belirli bir düğümün boş bacağına yerleştirir.
func (s *PendingPoolService) PlaceUserUnderByCode(ctx context.Context, sponsorID int64, code string, parentID int64, position string) (*models.User, error) {
	position = strings.ToUpper(strings.TrimSpace(position))
	if position != "L" && position != "R" {
		return nil, ErrInvalidPosition
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return nil, ErrUserNotFound
	}

	var userID int64
	err := s.db.QueryRow(ctx, `SELECT id FROM users WHERE member_code = $1`, code).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("üye sorgulanamadı: %w", err)
	}

	if err := s.validatePendingUser(ctx, userID); err != nil {
		return nil, err
	}

	// Havuz kaydı: bu sponsorun bekleyeni olmalı
	var poolID int64
	err = s.db.QueryRow(ctx,
		`SELECT id FROM pending_pool WHERE user_id = $1 AND sponsor_id = $2 AND is_placed = false`,
		userID, sponsorID).Scan(&poolID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrPoolEntryNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("havuz kaydı sorgulanamadı: %w", err)
	}

	// parentID, kullanıcının kendi ağacında olmalı (kendisi dahil)
	var inTree bool
	if err := s.db.QueryRow(ctx, `
		WITH RECURSIVE tree(id) AS (
			SELECT id FROM users WHERE parent_id = $1
			UNION ALL
			SELECT u.id FROM users u JOIN tree t ON u.parent_id = t.id
		)
		SELECT ($2 = $1) OR EXISTS(SELECT 1 FROM tree WHERE id = $2)`, sponsorID, parentID).Scan(&inTree); err != nil {
		return nil, fmt.Errorf("ağaç kontrolü başarısız: %w", err)
	}
	if !inTree {
		return nil, ErrInvalidPlacement
	}

	if err := s.validateSponsorExists(ctx, parentID); err != nil {
		return nil, err
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := placeUserInTx(ctx, tx, poolID, sponsorID, parentID, userID, position); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	u, err := scanUserRow(s.db.QueryRow(ctx, "SELECT "+userColumns+" FROM users WHERE id = $1", userID))
	if err != nil {
		return nil, fmt.Errorf("yerleşen üye okunamadı: %w", err)
	}
	return u, nil
}
