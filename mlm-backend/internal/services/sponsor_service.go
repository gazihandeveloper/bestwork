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

// ChangeSponsor üyenin sponsorunu değiştirir (kaçak ekip değiştirme/şikayet
// tespitinde üyeyi orijinal sponsora döndürmek için). Denetim loglu.
// Yalnızca sponsorluk bağını (sponsor_id) değiştirir; binary ağaç konumu
// (parent_id/position) MoveUserInTree ile ayrıca düzeltilebilir.
func ChangeSponsor(ctx context.Context, q DBTX, userID, newSponsorID, adminID int64, adminName string) error {
	if userID == newSponsorID {
		return errors.New("üye kendi kendine sponsor olamaz")
	}

	var (
		oldSponsorID *int64
		role         string
		isActive     bool
	)
	if err := q.QueryRow(ctx,
		`SELECT sponsor_id, role, is_active FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&oldSponsorID, &role, &isActive); err != nil {
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

	if _, err := q.Exec(ctx,
		`UPDATE users SET sponsor_id = $1, updated_at = NOW() WHERE id = $2`,
		newSponsorID, userID); err != nil {
		return fmt.Errorf("sponsor değiştirilemedi: %w", err)
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
