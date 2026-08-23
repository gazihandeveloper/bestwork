package main

import (
	"errors"
	"os"
	"os/signal"
	"syscall"

	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/config"
	"mlm-backend/internal/database"
	"mlm-backend/internal/services"
)

// Ay sonu cron scheduler'ı: her ayın 1'inde 00:00'da aylık kapanışı çalıştırır.
// CRON_SCHEDULE ortam değişkeni ile ifade değiştirilebilir
// (saniyeli 6 alanlı format desteklenir; ör: "*/10 * * * * *").
// Kullanım: go run ./cmd/cron
func main() {
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true})

	cfg := config.LoadConfig()

	if err := database.ConnectPostgres(cfg); err != nil {
		log.Fatalf("PostgreSQL bağlantısı kurulamadı: %v", err)
	}
	defer database.ClosePostgres()

	chips := services.NewChipService(database.GetDB())
	monthlyClose := services.NewMonthlyCloseService(database.GetDB(), chips)

	schedule := os.Getenv("CRON_SCHEDULE")
	if schedule == "" {
		schedule = "0 0 0 1 * *" // her ayın 1'i, saat 00:00:00
	}

	c := cron.New(cron.WithSeconds())

	if _, err := c.AddFunc(schedule, func() {
		log.Info("Aylık kapanış cron'u tetiklendi")
		if err := monthlyClose.ProcessMonthlyClose(); err != nil {
			if errors.Is(err, services.ErrMonthlyJobAlreadyRun) {
				log.Warn("Bu ay için aylık kapanış zaten çalıştırılmış, atlanıyor")
			} else {
				log.Errorf("Aylık kapanış başarısız: %v", err)
			}
			return
		}
		log.Info("Aylık kapanış cron'u tamamlandı")
	}); err != nil {
		log.Fatalf("Cron planlanamadı: %v", err)
	}

	c.Start()
	log.Infof("Cron scheduler başlatıldı (schedule: %s)", schedule)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Cron scheduler durduruldu")
}
