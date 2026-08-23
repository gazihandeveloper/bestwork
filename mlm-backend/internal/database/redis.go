package database

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/config"
)

// rdb uygulama genelinde paylaşılan Redis istemcisidir.
var rdb *redis.Client

// ConnectRedis yapılandırmadan Redis istemcisi oluşturur ve PING ile doğrular.
func ConnectRedis(cfg *config.Config) error {
	rdb = redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.RedisPassword,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis ping başarısız: %w", err)
	}

	log.Info("Redis bağlantısı kuruldu")
	return nil
}

// GetRedis mevcut Redis istemcisini döndürür.
func GetRedis() *redis.Client {
	return rdb
}

// CloseRedis Redis istemcisini kapatır.
func CloseRedis() {
	if rdb != nil {
		_ = rdb.Close()
		log.Info("Redis bağlantısı kapatıldı")
	}
}
