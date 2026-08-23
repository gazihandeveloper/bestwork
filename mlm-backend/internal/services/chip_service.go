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

// ChipService aylık %5 chip kesintisi ve ay sonu sıfırlama işlemlerini yürütür.
type ChipService struct {
	db *pgxpool.Pool
}

// NewChipService yeni bir ChipService örneği döndürür.
func NewChipService(db *pgxpool.Pool) *ChipService {
	return &ChipService{db: db}
}

// ApplyMonthlyChipDeduction tüm kullanıcılar için içinde bulunulan aya ait
// toplam kazancın %5'ini balance'dan chip_balance'a aktarır.
// Idempotent: aynı ay tekrar çağrılırsa ErrMonthlyJobAlreadyRun döner.
func (s *ChipService) ApplyMonthlyChipDeduction() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	return runJobWithGuard(ctx, s.db, "chip_deduction", s.applyMonthlyChipDeduction)
}

// ResetMonthlyBinaryEarnings tüm kullanıcıların current_month_binary_earned
// alanını sıfırlar (ay sonu flashout reseti).
// Idempotent: aynı ay tekrar çağrılırsa ErrMonthlyJobAlreadyRun döner.
func (s *ChipService) ResetMonthlyBinaryEarnings() error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	return runJobWithGuard(ctx, s.db, "binary_reset", resetMonthlyBinaryEarnings)
}

// applyMonthlyChipDeduction aylık %5 chip kesintisini transaction içinde uygular.
func (s *ChipService) applyMonthlyChipDeduction(ctx context.Context, q DBTX) error {
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

	totalDeducted := 0.0
	usersProcessed := 0

	for _, userID := range userIDs {
		// Bu ayki ödenmiş komisyon toplamı (referral + binary + matching)
		var monthEarnings float64
		if err := q.QueryRow(ctx, `
			SELECT COALESCE(SUM(amount), 0) FROM commissions
			WHERE user_id = $1 AND status = 'paid'
			  AND type IN ('referral','binary','matching')
			  AND created_at >= date_trunc('month', NOW())
			  AND created_at < date_trunc('month', NOW()) + interval '1 month'`,
			userID).Scan(&monthEarnings); err != nil {
			return fmt.Errorf("aylık kazanç hesaplanamadı: %w", err)
		}

		if monthEarnings <= 0 {
			continue
		}

		deduction := round2(monthEarnings * 0.05)
		if deduction <= 0 {
			continue
		}

		var balance float64
		if err := q.QueryRow(ctx, `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, userID).Scan(&balance); err != nil {
			return fmt.Errorf("cüzdan okunamadı: %w", err)
		}

		// Negatif bakiye olmasın: bakiyede ne kadar varsa o kadar taşınır
		move := deduction
		if moneyToCents(balance) < moneyToCents(move) {
			move = round2(balance)
		}
		if move <= 0 {
			continue
		}

		if _, err := q.Exec(ctx,
			`UPDATE wallets SET balance = balance - $1, chip_balance = chip_balance + $1, updated_at = NOW() WHERE user_id = $2`,
			move, userID); err != nil {
			return fmt.Errorf("cüzdan güncellenemedi: %w", err)
		}

		if _, err := q.Exec(ctx,
			`INSERT INTO chip_transactions (user_id, amount, type, reason) VALUES ($1, $2, 'credit', 'aylik %5 chip kesintisi')`,
			userID, move); err != nil {
			return fmt.Errorf("chip işlem kaydı eklenemedi: %w", err)
		}

		totalDeducted += move
		usersProcessed++
		log.WithFields(log.Fields{
			"user_id":        userID,
			"month_earnings": monthEarnings,
			"deduction":      deduction,
			"moved":          move,
		}).Info("Aylık %5 chip kesintisi uygulandı")
	}

	log.WithFields(log.Fields{
		"users_processed": usersProcessed,
		"total_deducted":  totalDeducted,
	}).Info("Aylık chip kesintisi tamamlandı")

	return nil
}

// resetMonthlyBinaryEarnings tüm kullanıcıların aylık binary kazanç sayacını sıfırlar.
func resetMonthlyBinaryEarnings(ctx context.Context, q DBTX) error {
	tag, err := q.Exec(ctx, `UPDATE users SET current_month_binary_earned = 0, updated_at = NOW()`)
	if err != nil {
		return fmt.Errorf("aylık binary kazanç sıfırlanamadı: %w", err)
	}

	log.WithField("rows", tag.RowsAffected()).Info("Aylık binary kazançlar sıfırlandı")
	return nil
}
