package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/config"
)

// candidateMigrationDirs migration dosyalarının aranacağı yollardır.
// go run ./cmd/migrate (mlm-backend içinden), repo kökünden ve Docker
// (/app) çalışma dizinlerinden çalıştırmayı destekler.
var candidateMigrationDirs = []string{
	"migrations",
	"mlm-backend/migrations",
	"/app/migrations",
}

// applyMigrations migrations/*.sql dosyalarını isim sırasına göre uygular.
// Uygulanan her dosya aynı transaction içinde schema_migrations tablosuna
// yazılır; böylece aynı sürüm ikinci kez çalıştırıldığında atlanır (idempotent).
func applyMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL DEFAULT NOW()
		)`); err != nil {
		return fmt.Errorf("schema_migrations tablosu oluşturulamadı: %w", err)
	}

	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return fmt.Errorf("migration dosyaları taranamadı: %w", err)
	}
	if len(files) == 0 {
		return fmt.Errorf("migrations klasöründe .sql dosyası bulunamadı: %s", dir)
	}
	sort.Strings(files)

	applied := 0
	for _, file := range files {
		version := filepath.Base(file)

		var exists bool
		if err := pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).
			Scan(&exists); err != nil {
			return fmt.Errorf("migration durumu sorgulanamadı: %w", err)
		}
		if exists {
			log.Infof("Migration zaten uygulanmış, atlanıyor: %s", version)
			continue
		}

		body, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("migration okunamadı (%s): %w", version, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("transaction başlatılamadı: %w", err)
		}

		if _, err := tx.Exec(ctx, string(body)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migration %s uygulanamadı: %w", version, err)
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migration kaydı eklenemedi (%s): %w", version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("migration commit edilemedi (%s): %w", version, err)
		}

		log.Infof("Migration uygulandı: %s", version)
		applied++
	}

	if applied == 0 {
		log.Info("Uygulanacak yeni migration yok")
	} else {
		log.Infof("%d migration başarıyla uygulandı", applied)
	}
	return nil
}

func main() {
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true})

	cfg := config.LoadConfig()

	// Migration SQL dosyaları çok deyimli olduğu için simple protocol kullanılır.
	poolCfg, err := pgxpool.ParseConfig(cfg.PostgresURI())
	if err != nil {
		log.Fatalf("Veritabanı yapılandırması çözümlenemedi: %v", err)
	}
	poolCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		log.Fatalf("PostgreSQL bağlantı havuzu oluşturulamadı: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("PostgreSQL ping başarısız: %v", err)
	}
	log.Info("PostgreSQL bağlantısı kuruldu")

	dir := ""
	for _, candidate := range candidateMigrationDirs {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			dir = candidate
			break
		}
	}
	if dir == "" {
		log.Fatal("migrations klasörü bulunamadı")
	}

	if err := applyMigrations(ctx, pool, dir); err != nil {
		log.Fatalf("Migration uygulanamadı: %v", err)
	}
}
