package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"
)

// MonthlyCloseService aylık kapanışı yürütür: toplu binary eşleşme,
// rütbe güncelleme, %5 chip kesintisi ve binary kazanç sıfırlama.
type MonthlyCloseService struct {
	db    *pgxpool.Pool
	chips *ChipService
}

// NewMonthlyCloseService yeni bir MonthlyCloseService örneği döndürür.
func NewMonthlyCloseService(db *pgxpool.Pool, chips *ChipService) *MonthlyCloseService {
	return &MonthlyCloseService{db: db, chips: chips}
}

// ProcessMonthlyClose aylık kapanışı idempotent olarak çalıştırır:
//  1. 'monthly_close' guard'ı ile toplu binary eşleşme + rütbe güncelleme.
//  2. Chip kesintisi ve binary sıfırlama (her birinin kendi guard'ı var;
//     ayrı çalıştırılmışsa atlanır).
//
// Kapanış daha önce çalıştırılmışsa ErrMonthlyJobAlreadyRun döner
// (chip/sıfırlama yine denenir, onlar da kendi guard'larıyla atlar).
func (s *MonthlyCloseService) ProcessMonthlyClose() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	closeErr := runJobWithGuard(ctx, s.db, "monthly_close", s.processClose)
	if closeErr != nil && !errors.Is(closeErr, ErrMonthlyJobAlreadyRun) {
		return closeErr
	}

	if err := s.chips.ApplyMonthlyChipDeduction(); err != nil {
		if !errors.Is(err, ErrMonthlyJobAlreadyRun) {
			return err
		}
	}

	if err := s.chips.ResetMonthlyBinaryEarnings(); err != nil {
		if !errors.Is(err, ErrMonthlyJobAlreadyRun) {
			return err
		}
	}

	return closeErr
}

// processClose önce tüm kariyerleri yeniden hesaplar (matching primi taze
// unvanlara göre ödensin), ardından tüm aktif kullanıcılar için binary eşleşme
// yapar (transaction içinde).
func (s *MonthlyCloseService) processClose(ctx context.Context, q DBTX) error {
	// 1) Kariyerleri yeniden hesapla.
	if _, err := RecomputeAllCareers(ctx, q); err != nil {
		return fmt.Errorf("kariyer hesaplama başarısız: %w", err)
	}

	// 2) Binary eşleşme (binary + matching).
	rows, err := q.Query(ctx, `SELECT id FROM users WHERE is_active = true ORDER BY id`)
	if err != nil {
		return fmt.Errorf("kullanıcılar listelenemedi: %w", err)
	}
	defer rows.Close()

	userIDs := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return fmt.Errorf("kullanıcı okunamadı: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	rows.Close()

	for _, userID := range userIDs {
		if err := MatchBinary(ctx, q, userID); err != nil {
			return fmt.Errorf("binary eşleşme başarısız (user %d): %w", userID, err)
		}
	}

	log.WithField("users_processed", len(userIDs)).Info("Aylık kapanış: kariyer + binary eşleşme tamamlandı")
	return nil
}
