package services

import (
	"context"
	"fmt"
	"regexp"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrInvalidSettingKey geçersiz ayar anahtarı kullanıldığında döndürülür.
var ErrInvalidSettingKey = fmt.Errorf("geçersiz ayar anahtarı")

// validSettingKey ayar anahtarlarını doğrular (ör. corporate_title).
var validSettingKey = regexp.MustCompile(`^[a-z][a-z0-9_]{2,}$`)

// SettingService site ayarlarını (key/value) yönetir.
type SettingService struct {
	db *pgxpool.Pool
}

// NewSettingService yeni bir SettingService örneği döndürür.
func NewSettingService(db *pgxpool.Pool) *SettingService {
	return &SettingService{db: db}
}

// GetAll tüm ayarları map olarak döndürür (herkese açık; site içeriğidir).
func (s *SettingService) GetAll(ctx context.Context) (map[string]string, error) {
	rows, err := s.db.Query(ctx, `SELECT key, value FROM settings`)
	if err != nil {
		return nil, fmt.Errorf("ayarlar okunamadı: %w", err)
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, fmt.Errorf("ayar okunamadı: %w", err)
		}
		settings[k] = v
	}
	return settings, rows.Err()
}

// SetAll verilen ayarları upsert eder; geçersiz anahtarları reddeder (admin).
func (s *SettingService) SetAll(ctx context.Context, values map[string]string) error {
	for key := range values {
		if !validSettingKey.MatchString(key) {
			return fmt.Errorf("%w: %s", ErrInvalidSettingKey, key)
		}
	}

	for key, value := range values {
		if _, err := s.db.Exec(ctx,
			`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
			 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
			key, value); err != nil {
			return fmt.Errorf("ayar kaydedilemedi (%s): %w", key, err)
		}
	}
	return nil
}
