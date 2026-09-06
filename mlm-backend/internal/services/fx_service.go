package services

import (
	"context"
	"errors"
	"strconv"
	"strings"
)

// ── Manuel USD/TRY kuru ─────────────────────────────────────────────────────
// Şirket döviz kurunu kendisi belirler: settings.usd_try_rate anahtarında
// manuel olarak tutulur (admin panel "Manuel Kur" sayfasından girilir).
// Otomatik TCMB çekimi YOKTUR. Her çağrıda DB'den okunur ki değişiklik
// anında yansısın.

const usdTryKey = "usd_try_rate"

// Kur değeri 0 veya eksikse kullanılacak güvenli varsayılan.
const defaultUSDTRY = 40.0

// GetUSDTRY settings'teki manuel USD/TRY kurunu döndürür; kayıt yoksa
// varsayılanı kullanır (bonus ödemeleri kur eksikliği yüzünden durmaz).
func GetUSDTRY(ctx context.Context, q DBTX) (float64, error) {
	var stored string
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, usdTryKey).Scan(&stored)
	if err == nil {
		if r, perr := strconv.ParseFloat(strings.TrimSpace(stored), 64); perr == nil && r > 0 {
			return r, nil
		}
	}
	return defaultUSDTRY, nil
}

// SetManualUSDTRY kuru settings'e yazar (admin; transaction içinde çalışır).
func SetManualUSDTRY(ctx context.Context, q DBTX, rate float64) error {
	if rate <= 0 {
		return errors.New("kur 0'dan büyük olmalıdır")
	}
	if _, err := q.Exec(ctx,
		`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
		 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
		usdTryKey, strconv.FormatFloat(rate, 'f', 4, 64)); err != nil {
		return err
	}
	return nil
}
