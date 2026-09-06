package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

// ErrSponsorCycle yeni sponsorun üyenin kendi sponsor alt ağacında olmasını engeller.
var ErrSponsorCycle = errors.New("yeni sponsor üyenin kendi alt ekibinde olamaz")

// ChangeSponsor üyenin sponsorunu değiştirir ve üyeyi yerleşim bekleyenler
// havuzuna (pending pool) düşürür; böylece admin yeni sponsorun altına
// yerleştirene kadar bekler. Denetim loglu, tek transaction'da çalışır.
// İş kuralı: binary ağaca yerleşmiş (parent_id dolu) üyeler, alt ağaçları
// olduğu sürece taşınamaz — alt ağaç boşsa ağaçtan çıkarılıp havuza düşer.
func ChangeSponsor(ctx context.Context, q DBTX, userID, newSponsorID, adminID int64, adminName string) error {
	if userID == newSponsorID {
		return errors.New("üye kendi kendine sponsor olamaz")
	}

	var (
		oldSponsorID *int64
		parentID     *int64
		role         string
		isActive     bool
	)
	if err := q.QueryRow(ctx,
		`SELECT sponsor_id, parent_id, role, is_active FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&oldSponsorID, &parentID, &role, &isActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("üye okunamadı: %w", err)
	}
	if !isActive {
		return ErrInactiveUser
	}
	if role == "admin" || role == "super_admin" {
		return errors.New("yönetici hesaplarının sponsoru değiştirilemez")
	}

	var newSponsorActive bool
	if err := q.QueryRow(ctx,
		`SELECT is_active FROM users WHERE id = $1`, newSponsorID).Scan(&newSponsorActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSponsorNotFound
		}
		return fmt.Errorf("sponsor okunamadı: %w", err)
	}
	if !newSponsorActive {
		return ErrInactiveUser
	}

	// Döngü kontrolü: yeni sponsor, üyenin sponsor alt ağacında olamaz.
	var inSubtree bool
	if err := q.QueryRow(ctx, `
		WITH RECURSIVE sub(id) AS (
			SELECT id FROM users WHERE sponsor_id = $1
			UNION ALL
			SELECT u.id FROM users u JOIN sub s ON u.sponsor_id = s.id
		)
		SELECT EXISTS(SELECT 1 FROM sub WHERE id = $2)`, userID, newSponsorID).Scan(&inSubtree); err != nil {
		return fmt.Errorf("alt ekip kontrolü başarısız: %w", err)
	}
	if inSubtree {
		return ErrSponsorCycle
	}

	if oldSponsorID != nil && *oldSponsorID == newSponsorID {
		return errors.New("üye zaten bu sponsora bağlı")
	}

	// Binary ağaca yerleşmişse (parent_id dolu): alt ağacı varsa taşınamaz,
	// alt ağacı yoksa ağaçtan çıkarılıp havuza düşer.
	if parentID != nil {
		var hasDownline bool
		if err := q.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM users WHERE parent_id = $1)`, userID).Scan(&hasDownline); err != nil {
			return fmt.Errorf("alt ağaç kontrolü başarısız: %w", err)
		}
		if hasDownline {
			return errors.New("ağaca yerleşmiş üyenin alt ağacı var; sponsor değişimi için önce alt ağacını taşıyın")
		}
	}

	// Sponsor bağını güncelle
	if _, err := q.Exec(ctx,
		`UPDATE users SET sponsor_id = $1, updated_at = NOW() WHERE id = $2`,
		newSponsorID, userID); err != nil {
		return fmt.Errorf("sponsor değiştirilemedi: %w", err)
	}

	// Binary ağaçta yalnız üyeyi ağaçtan çıkar (alt ağacı olmadığı doğrulandı)
	if parentID != nil {
		oldParent := *parentID
		if _, err := q.Exec(ctx,
			`UPDATE users SET parent_id = NULL, position = NULL, updated_at = NOW() WHERE id = $1`,
			userID); err != nil {
			return fmt.Errorf("üye ağaçtan çıkarılamadı: %w", err)
		}

		// Eski üst hattaki tüm ataların bacak toplamlarını yeniden hesapla
		current := oldParent
		seen := map[int64]bool{}
		for current != 0 && !seen[current] {
			seen[current] = true
			if err := recomputeLegsInTx(ctx, q, current); err != nil {
				return err
			}
			if err := MatchBinary(ctx, q, current); err != nil {
				return err
			}
			var next *int64
			if err := q.QueryRow(ctx, `SELECT parent_id FROM users WHERE id = $1`, current).Scan(&next); err != nil {
				return fmt.Errorf("üst hat okunamadı: %w", err)
			}
			if next == nil {
				break
			}
			current = *next
		}
	}

	// Yerleşim bekleyenler havuzuna ekle (idempotent; yeni sponsora bağla).
	// Açık (is_placed=false) kayıt varsa sponsor_id güncellenir; yoksa yeni kayıt eklenir.
	tag, err := q.Exec(ctx,
		`UPDATE pending_pool SET sponsor_id = $1, is_placed = false, placed_at = NULL,
			placed_under_id = NULL, placed_position = NULL
		 WHERE user_id = $2 AND is_placed = false`,
		newSponsorID, userID)
	if err != nil {
		return fmt.Errorf("bekleyen kayıt güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		if _, err := q.Exec(ctx,
			`INSERT INTO pending_pool (user_id, sponsor_id) VALUES ($1, $2)`,
			userID, newSponsorID); err != nil {
			return fmt.Errorf("yerleşim bekleyenlere eklenemedi: %w", err)
		}
	}

	// Kullanıcı bayrağını yerleşim bekleyen olarak işaretle
	if _, err := q.Exec(ctx,
		`UPDATE users SET is_in_pending_pool = true, pending_since = COALESCE(pending_since, NOW()), updated_at = NOW() WHERE id = $1`,
		userID); err != nil {
		return fmt.Errorf("bekleyen durumu güncellenemedi: %w", err)
	}

	if err := logInTx(ctx, q, adminID, adminName, "sponsor_change", "user", &userID, "", map[string]any{
		"old_sponsor_id": oldSponsorID,
		"new_sponsor_id": newSponsorID,
	}); err != nil {
		return err
	}

	log.WithFields(log.Fields{"user_id": userID, "new_sponsor_id": newSponsorID}).Info("Sponsor değiştirildi")
	return nil
}
