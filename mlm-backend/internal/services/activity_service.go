package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

// ── Aktiflik şartı: hedef paket kayıtları ───────────────────────────────────
// Kural (kumbara sistemi KALDIRILDI, ödül yok):
//   - Kişi, kendi kaydettiği (1. hat sponsorluğu) alt üyelerden bu ay HEDEF
//     PAKET seviyesine (varsayılan: Bronze) ulaşanları saydırır.
//   - Hedef sayıya ulaşan üye o ay AKTİF sayılır (kariyeri düşmez; ürün
//     alışverişi şartı yoktur). Hedef paket ve adet panelden değiştirilebilir.
//   - Aylık değerlendirme ay sonunda yapılır; sayaç her ay sıfırlanır.

// readSettingInt settings anahtarının tamsayı değerini okur; yoksa/hatalıysa def döner.
func readSettingInt(ctx context.Context, q DBTX, key string, def int) int {
	var v string
	if err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&v); err != nil {
		return def
	}
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || n < 0 {
		return def
	}
	return n
}

// activityPackageID aktiflik hedef paketini döndürür (settings.activity_package_id,
// varsayılan 2 = Bronze).
func activityPackageID(ctx context.Context, q DBTX) int {
	return readSettingInt(ctx, q, "activity_package_id", 2)
}

// activityGoalCount aktiflik için kaç hedef paket kaydı gerektiğini döndürür
// (settings.activity_goal_count, varsayılan 2).
func activityGoalCount(ctx context.Context, q DBTX) int {
	return readSettingInt(ctx, q, "activity_goal_count", 2)
}

// RegisterActivityPackage alt üye hedef pakete İLK kez ulaştığında çağrılır:
// sponsora (1. hat) o ayki paket kayıt sayacı +1.
// userID = pakete ulaşan üye; sponsorID = onu kaydeden üye (1. hat).
func RegisterActivityPackage(ctx context.Context, q DBTX, userID, sponsorID int64) error {
	if sponsorID <= 0 {
		return nil
	}

	var newCount int
	if err := q.QueryRow(ctx,
		`UPDATE users SET current_month_platinum_count = current_month_platinum_count + 1, updated_at = NOW()
		 WHERE id = $1 RETURNING current_month_platinum_count`,
		sponsorID).Scan(&newCount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // sponsor yok/bağlı değil
		}
		return fmt.Errorf("paket sayacı güncellenemedi: %w", err)
	}

	log.WithFields(log.Fields{
		"user_id":     userID,
		"sponsor_id":  sponsorID,
		"month_count": newCount,
		"goal":        activityGoalCount(ctx, q),
	}).Info("Hedef paket kaydı sayıldı (aktiflik şartı)")
	return nil
}
