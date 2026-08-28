package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"
)

// Ağaç yönetimi hataları.
var (
	ErrNotPlacedInTree  = errors.New("üye henüz ağaca yerleştirilmemiş")
	ErrCannotMoveToSelf = errors.New("üye kendi altına taşınamaz")
	ErrTargetInSubtree  = errors.New("hedef, taşınan üyenin alt ağacındadır; döngü oluşur")
	ErrSameSlot         = errors.New("üye zaten bu konumda")
)

// TreeAdminService admin ağaç manipülasyonlarını (düğüm taşıma) yönetir.
type TreeAdminService struct {
	db *pgxpool.Pool
}

// NewTreeAdminService yeni bir TreeAdminService örneği döndürür.
func NewTreeAdminService(db *pgxpool.Pool) *TreeAdminService {
	return &TreeAdminService{db: db}
}

// MoveUserInTree bir üyeyi (alt ağacıyla birlikte) yeni bir ebeveynin
// seçilen bacağına taşır. İşlem sonrası eski ve yeni üst hatların bacak
// toplamları kanonik olarak yeniden hesaplanır ve canlı binary eşleşmesi
// çalıştırılır. Tüm işlem tek transaction'dadır ve denetim kaydı yazılır.
func (s *TreeAdminService) MoveUserInTree(ctx context.Context, adminID int64, adminName string, userID, newParentID int64, position string) error {
	position = strings.ToUpper(strings.TrimSpace(position))
	if position != "L" && position != "R" {
		return ErrInvalidPosition
	}
	if userID == newParentID {
		return ErrCannotMoveToSelf
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	// Taşınan üyeyi kilitle ve mevcut konumunu oku
	var (
		oldParentID *int64
		oldPosition *string
		userActive  bool
	)
	err = tx.QueryRow(ctx,
		`SELECT parent_id, position, is_active FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&oldParentID, &oldPosition, &userActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrUserNotFound
	}
	if err != nil {
		return fmt.Errorf("üye okunamadı: %w", err)
	}
	if oldParentID == nil || oldPosition == nil {
		return ErrNotPlacedInTree
	}
	if !userActive {
		return ErrInactiveUser
	}

	// Hedef ebeveyni doğrula
	var newParentActive bool
	err = tx.QueryRow(ctx, `SELECT is_active FROM users WHERE id = $1 FOR UPDATE`, newParentID).
		Scan(&newParentActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSponsorNotFound
	}
	if err != nil {
		return fmt.Errorf("hedef üye okunamadı: %w", err)
	}
	if !newParentActive {
		return ErrInactiveUser
	}

	// Aynı konuma taşıma = no-op
	if *oldParentID == newParentID && *oldPosition == position {
		return ErrSameSlot
	}

	// Döngü kontrolü: hedef, taşınan üyenin alt ağacında olamaz
	var inSubtree bool
	if err := tx.QueryRow(ctx, `
		WITH RECURSIVE sub(id) AS (
			SELECT id FROM users WHERE parent_id = $1
			UNION ALL
			SELECT u.id FROM users u JOIN sub s ON u.parent_id = s.id
		)
		SELECT EXISTS(SELECT 1 FROM sub WHERE id = $2)`, userID, newParentID).Scan(&inSubtree); err != nil {
		return fmt.Errorf("alt ağaç kontrolü başarısız: %w", err)
	}
	if inSubtree {
		return ErrTargetInSubtree
	}

	// Hedef bacak boş mu? (üyenin kendi mevcut yuvası hariç)
	var occupied bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE parent_id = $1 AND position = $2 AND id <> $3)`,
		newParentID, position, userID).Scan(&occupied); err != nil {
		return fmt.Errorf("bacak kontrolü başarısız: %w", err)
	}
	if occupied {
		return ErrPositionOccupied
	}

	// Taşınan alt ağacın toplam PV/CV'si (üye dahil)
	var subPV, subCV int64
	if err := tx.QueryRow(ctx, `
		WITH RECURSIVE sub(id) AS (
			SELECT $1::bigint
			UNION ALL
			SELECT u.id FROM users u JOIN sub s ON u.parent_id = s.id
		)
		SELECT COALESCE(SUM(u.total_pv_accumulated), 0), COALESCE(SUM(u.total_cv_accumulated), 0)
		FROM users u WHERE u.id IN (SELECT id FROM sub)`, userID).Scan(&subPV, &subCV); err != nil {
		return fmt.Errorf("alt ağaç PV/CV okunamadı: %w", err)
	}

	// Konumu güncelle
	if _, err := tx.Exec(ctx,
		`UPDATE users SET parent_id = $1, position = $2, updated_at = NOW() WHERE id = $3`,
		newParentID, position, userID); err != nil {
		return fmt.Errorf("üye taşınamadı: %w", err)
	}

	// Eski ve yeni üst hatlardaki tüm ataların bacak toplamlarını kanonik
	// yeniden hesapla (binary_transactions'taki deduct kayıtları düşülür).
	affected := make(map[int64]bool)
	for _, id := range []int64{*oldParentID, newParentID} {
		current := id
		for current != 0 {
			if affected[current] {
				break
			}
			affected[current] = true
			var next *int64
			if err := tx.QueryRow(ctx, `SELECT parent_id FROM users WHERE id = $1`, current).Scan(&next); err != nil {
				return fmt.Errorf("üst hat okunamadı: %w", err)
			}
			if next == nil {
				break
			}
			current = *next
		}
	}

	for ancestorID := range affected {
		if err := recomputeLegsInTx(ctx, tx, ancestorID); err != nil {
			return err
		}
	}

	// Canlı eşleşme: önce en yakın atalardan başlayarak köke doğru çalıştır
	for ancestorID := range affected {
		if err := MatchBinary(ctx, tx, ancestorID); err != nil {
			return fmt.Errorf("binary eşleşme çalıştırılamadı: %w", err)
		}
	}

	meta := map[string]any{
		"user_id":        userID,
		"old_parent_id":  *oldParentID,
		"old_position":   *oldPosition,
		"new_parent_id":  newParentID,
		"new_position":   position,
		"subtree_pv":     subPV,
		"subtree_cv":     subCV,
	}
	if err := logInTx(ctx, tx, adminID, adminName, "tree_move", "user", &userID, "", meta); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{
		"user_id":       userID,
		"new_parent_id": newParentID,
		"position":      position,
		"subtree_pv":    subPV,
		"subtree_cv":    subCV,
	}).Info("Üye alt ağacıyla birlikte taşındı")

	return nil
}

// recomputeLegsInTx bir üyenin sol/sağ bacak toplamlarını alt ağacından
// kanonik olarak yeniden hesaplar:
//   - bacak PV = alt ağaçtaki üyelerin total_pv_accumulated toplamı
//   - bacak CV = alt ağaçtaki üyelerin total_cv_accumulated toplamı
//     eksi o bacakta yapılmış binary eşleşme düşümleri (deduct)
func recomputeLegsInTx(ctx context.Context, tx DBTX, memberID int64) error {
	var pvL, pvR, cvL, cvR int64
	err := tx.QueryRow(ctx, `
		WITH RECURSIVE sub(id, leg) AS (
			SELECT id, position FROM users WHERE parent_id = $1 AND position IN ('L','R')
			UNION ALL
			SELECT u.id, s.leg FROM users u JOIN sub s ON u.parent_id = s.id
		)
		SELECT
			COALESCE(SUM(u.total_pv_accumulated) FILTER (WHERE s.leg = 'L'), 0),
			COALESCE(SUM(u.total_pv_accumulated) FILTER (WHERE s.leg = 'R'), 0),
			COALESCE(SUM(u.total_cv_accumulated) FILTER (WHERE s.leg = 'L'), 0),
			COALESCE(SUM(u.total_cv_accumulated) FILTER (WHERE s.leg = 'R'), 0)
		FROM sub s
		JOIN users u ON u.id = s.id`, memberID).Scan(&pvL, &pvR, &cvL, &cvR)
	if err != nil {
		return fmt.Errorf("bacak toplamları hesaplanamadı: %w", err)
	}

	var deductL, deductR int64
	if err := tx.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(cv) FILTER (WHERE position = 'L'), 0),
			COALESCE(SUM(cv) FILTER (WHERE position = 'R'), 0)
		FROM binary_transactions
		WHERE user_id = $1 AND transaction_type = 'deduct'`, memberID).Scan(&deductL, &deductR); err != nil {
		return fmt.Errorf("binary düşümleri okunamadı: %w", err)
	}

	cvL -= deductL
	cvR -= deductR
	if cvL < 0 {
		cvL = 0
	}
	if cvR < 0 {
		cvR = 0
	}

	if _, err := tx.Exec(ctx, `
		UPDATE users SET total_pv_left = $1, total_pv_right = $2,
			total_cv_left = $3, total_cv_right = $4, updated_at = NOW()
		WHERE id = $5`, pvL, pvR, cvL, cvR, memberID); err != nil {
		return fmt.Errorf("bacak toplamları güncellenemedi: %w", err)
	}
	return nil
}
