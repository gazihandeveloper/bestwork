package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/config"
)

// pool uygulama genelinde paylaşılan PostgreSQL bağlantı havuzudur.
var pool *pgxpool.Pool

// ConnectPostgres yapılandırmadan bağlantı havuzu oluşturur ve Ping ile doğrular.
func ConnectPostgres(cfg *config.Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	pool, err = pgxpool.New(ctx, cfg.PostgresURI())
	if err != nil {
		return fmt.Errorf("postgres bağlantı havuzu oluşturulamadı: %w", err)
	}

	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return fmt.Errorf("postgres ping başarısız: %w", err)
	}

	log.Info("PostgreSQL bağlantısı kuruldu")
	return nil
}

// GetDB mevcut bağlantı havuzunu döndürür.
func GetDB() *pgxpool.Pool {
	return pool
}

// ClosePostgres bağlantı havuzunu kapatır.
func ClosePostgres() {
	if pool != nil {
		pool.Close()
		log.Info("PostgreSQL bağlantısı kapatıldı")
	}
}
