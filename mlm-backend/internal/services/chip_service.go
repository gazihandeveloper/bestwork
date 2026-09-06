package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"
)

// ErrMonthlyJobAlreadyRun aynı ay için ilgili aylık iş daha önce çalıştırıldığında döner.
var ErrMonthlyJobAlreadyRun = errors.New("bu ay için ilgili aylık iş zaten çalıştırılmış")

// runJobWithGuard aylık bir işi idempotent olarak çalıştırır:
// monthly_jobs tablosuna 'YYYY-MM' dönemi için kayıt açılır; çakışırsa
// ErrMonthlyJobAlreadyRun döner ve fn hiç çağrılmaz. Aksi halde fn aynı
// transaction içinde yürütülür ve kayıt commit ile kalıcı olur.
func runJobWithGuard(ctx context.Context, db *pgxpool.Pool, jobType string, fn func(context.Context, DBTX) error) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	period := time.Now().Format("2006-01")

	tag, err := tx.Exec(ctx,
		`INSERT INTO monthly_jobs (job_type, job_month) VALUES ($1, $2)
		 ON CONFLICT (job_type, job_month) DO NOTHING`, jobType, period)
	if err != nil {
		return fmt.Errorf("aylık iş kaydı oluşturulamadı: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrMonthlyJobAlreadyRun
	}

	if err := fn(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"job_type": jobType, "job_month": period}).Info("Aylık iş tamamlandı")
	return nil
}

// ChipService ay sonu sıfırlama işlemlerini yürütür.
type ChipService struct {
	db *pgxpool.Pool
}

// NewChipService yeni bir ChipService örneği döndürür.
func NewChipService(db *pgxpool.Pool) *ChipService {
	return &ChipService{db: db}
}

// ResetMonthlyBinaryEarnings tüm kullanıcıların current_month_binary_earned
// alanını sıfırlar (ay sonu flashout reseti).
// Idempotent: aynı ay tekrar çağrılırsa ErrMonthlyJobAlreadyRun döner.
func (s *ChipService) ResetMonthlyBinaryEarnings() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	return runJobWithGuard(ctx, s.db, "binary_reset", resetMonthlyBinaryEarnings)
}

// resetMonthlyBinaryEarnings tüm kullanıcıların aylık binary kazanç sayacını,
// aylık kişisel PV sayacını ve aylık Platin kayıt sayacını sıfırlar
// (ay sonu flashout + aktiflik reseti).
func resetMonthlyBinaryEarnings(ctx context.Context, q DBTX) error {
	tag, err := q.Exec(ctx, `UPDATE users SET current_month_binary_earned = 0, current_month_personal_pv = 0, current_month_platinum_count = 0, updated_at = NOW()`)
	if err != nil {
		return fmt.Errorf("aylık binary kazanç sıfırlanamadı: %w", err)
	}

	log.WithField("rows", tag.RowsAffected()).Info("Aylık binary kazançlar, kişisel PV ve Platin kayıtları sıfırlandı")
	return nil
}
