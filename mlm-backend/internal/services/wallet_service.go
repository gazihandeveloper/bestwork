package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// Cüzdan ve para çekme işlemlerine özel hatalar.
var (
	ErrWithdrawAmountTooLow     = errors.New("minimum çekim tutarı 750 TL'dir")
	ErrInsufficientBalance      = errors.New("yetersiz bakiye")
	ErrWithdrawRequestNotFound  = errors.New("çekim talebi bulunamadı")
	ErrWithdrawAlreadyProcessed = errors.New("çekim talebi zaten işlenmiş")
	ErrWalletNotFound           = errors.New("cüzdan bulunamadı")
)

// WalletService cüzdan ve para çekme taleplerini yürütür.
type WalletService struct {
	db *pgxpool.Pool
}

// NewWalletService yeni bir WalletService örneği döndürür.
func NewWalletService(db *pgxpool.Pool) *WalletService {
	return &WalletService{db: db}
}

const withdrawColumns = `id, user_id, amount, method, status, requested_at, processed_at`

// GetWalletByUserID kullanıcının cüzdanını döndürür.
func (s *WalletService) GetWalletByUserID(ctx context.Context, userID int64) (*models.Wallet, error) {
	var w models.Wallet
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, updated_at
		 FROM wallets WHERE user_id = $1`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.TotalEarned, &w.TotalWithdrawn, &w.ChipBalance, &w.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWalletNotFound
		}
		return nil, fmt.Errorf("cüzdan okunamadı: %w", err)
	}
	return &w, nil
}

// CreateWithdrawRequest çekim talebi oluşturur (para bu aşamada çekilmez).
func (s *WalletService) CreateWithdrawRequest(ctx context.Context, userID int64, amount float64, method string) (*models.WithdrawRequest, error) {
	amount = round2(amount)
	if moneyToCents(amount) < 75000 {
		return nil, ErrWithdrawAmountTooLow
	}

	wallet, err := s.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if moneyToCents(wallet.Balance) < moneyToCents(amount) {
		return nil, ErrInsufficientBalance
	}

	var methodPtr *string
	if method != "" {
		m := method
		methodPtr = &m
	}

	wr := &models.WithdrawRequest{
		UserID: userID,
		Amount: amount,
		Method: methodPtr,
		Status: "pending",
	}
	err = s.db.QueryRow(ctx,
		`INSERT INTO withdraw_requests (user_id, amount, method) VALUES ($1, $2, $3) RETURNING id, requested_at`,
		wr.UserID, wr.Amount, wr.Method).Scan(&wr.ID, &wr.RequestedAt)
	if err != nil {
		return nil, fmt.Errorf("çekim talebi oluşturulamadı: %w", err)
	}

	log.WithFields(log.Fields{"user_id": userID, "amount": wr.Amount, "request_id": wr.ID}).
		Info("Çekim talebi oluşturuldu")

	return wr, nil
}

// ListUserWithdrawRequests kullanıcının kendi çekim taleplerini döndürür.
func (s *WalletService) ListUserWithdrawRequests(ctx context.Context, userID int64) ([]models.WithdrawRequest, error) {
	return s.listWithdraws(ctx, `SELECT `+withdrawColumns+` FROM withdraw_requests WHERE user_id = $1 ORDER BY id DESC`, userID)
}

// ListAllWithdrawRequests tüm çekim taleplerini döndürür (admin).
func (s *WalletService) ListAllWithdrawRequests(ctx context.Context) ([]models.WithdrawRequest, error) {
	return s.listWithdraws(ctx, `SELECT `+withdrawColumns+` FROM withdraw_requests ORDER BY id DESC`)
}

func (s *WalletService) listWithdraws(ctx context.Context, query string, args ...interface{}) ([]models.WithdrawRequest, error) {
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("çekim talepleri listelenemedi: %w", err)
	}
	defer rows.Close()

	requests := make([]models.WithdrawRequest, 0)
	for rows.Next() {
		var wr models.WithdrawRequest
		if err := rows.Scan(&wr.ID, &wr.UserID, &wr.Amount, &wr.Method, &wr.Status, &wr.RequestedAt, &wr.ProcessedAt); err != nil {
			return nil, fmt.Errorf("çekim talebi okunamadı: %w", err)
		}
		requests = append(requests, wr)
	}
	return requests, rows.Err()
}

// ApproveWithdrawRequest talebi onaylar: bakiyeden düşer, total_withdrawn'a ekler.
func (s *WalletService) ApproveWithdrawRequest(ctx context.Context, requestID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		userID int64
		amount float64
		status string
	)
	err = tx.QueryRow(ctx,
		`SELECT user_id, amount, status FROM withdraw_requests WHERE id = $1 FOR UPDATE`, requestID).
		Scan(&userID, &amount, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrWithdrawRequestNotFound
	}
	if err != nil {
		return fmt.Errorf("çekim talebi okunamadı: %w", err)
	}
	if status != "pending" {
		return ErrWithdrawAlreadyProcessed
	}

	var balance float64
	if err := tx.QueryRow(ctx, `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, userID).Scan(&balance); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWalletNotFound
		}
		return fmt.Errorf("cüzdan okunamadı: %w", err)
	}
	if moneyToCents(balance) < moneyToCents(amount) {
		return ErrInsufficientBalance
	}

	if _, err := tx.Exec(ctx,
		`UPDATE wallets SET balance = balance - $1, total_withdrawn = total_withdrawn + $1, updated_at = NOW() WHERE user_id = $2`,
		amount, userID); err != nil {
		return fmt.Errorf("cüzdan güncellenemedi: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE withdraw_requests SET status = 'approved', processed_at = NOW() WHERE id = $1`, requestID); err != nil {
		return fmt.Errorf("talep durumu güncellenemedi: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"request_id": requestID, "user_id": userID, "amount": amount}).
		Info("Çekim talebi onaylandı")

	return nil
}

// RejectWithdrawRequest talebi reddeder (bakiyeye dokunmaz).
func (s *WalletService) RejectWithdrawRequest(ctx context.Context, requestID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx, `SELECT status FROM withdraw_requests WHERE id = $1 FOR UPDATE`, requestID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrWithdrawRequestNotFound
	}
	if err != nil {
		return fmt.Errorf("çekim talebi okunamadı: %w", err)
	}
	if status != "pending" {
		return ErrWithdrawAlreadyProcessed
	}

	if _, err := tx.Exec(ctx,
		`UPDATE withdraw_requests SET status = 'rejected', processed_at = NOW() WHERE id = $1`, requestID); err != nil {
		return fmt.Errorf("talep durumu güncellenemedi: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"request_id": requestID}).Info("Çekim talebi reddedildi")

	return nil
}
