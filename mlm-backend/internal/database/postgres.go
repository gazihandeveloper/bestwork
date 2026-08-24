package database

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/config"
)

// pool uygulama genelinde paylaşılan PostgreSQL bağlantı havuzudur.
var pool *pgxpool.Pool

// ConnectPostgres yapılandırmadan bağlantı havuzu oluşturur ve Ping ile doğrular.
// MaxConns (DB_MAX_CONNS, varsayılan 25) recursive ağaç sorgularının ve paralel
// isteklerin bağlantı havuzunu tüketmesini önler.
func ConnectPostgres(cfg *config.Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.PostgresURI())
	if err != nil {
		return fmt.Errorf("postgres bağlantı yapılandırması çözümlenemedi: %w", err)
	}
	if v := os.Getenv("DB_MAX_CONNS"); v != "" {
		n, convErr := strconv.Atoi(v)
		if convErr == nil && n > 0 {
			poolCfg.MaxConns = int32(n)
		}
	} else {
		poolCfg.MaxConns = 25
	}

	pool, err = pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return fmt.Errorf("postgres bağlantı havuzu oluşturulamadı: %w", err)
	}

	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return fmt.Errorf("postgres ping başarısız: %w", err)
	}

	log.Infof("PostgreSQL bağlantısı kuruldu (max conns: %d)", poolCfg.MaxConns)
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
