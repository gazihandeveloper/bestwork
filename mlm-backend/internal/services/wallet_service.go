package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, blocked_balance, updated_at
		 FROM wallets WHERE user_id = $1`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.TotalEarned, &w.TotalWithdrawn, &w.ChipBalance, &w.BlockedBalance, &w.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWalletNotFound
		}
		return nil, fmt.Errorf("cüzdan okunamadı: %w", err)
	}
	return &w, nil
}

// WalletTransaction cüzdan hareket defterindeki bir kaydı temsil eder.
type WalletTransaction struct {
	ID        int64   `json:"id"`
	WalletID  int64   `json:"wallet_id"`
	Amount    float64 `json:"amount"`
	Type      string  `json:"type"`
	Reason    *string `json:"reason"`
	AdminID   *int64  `json:"admin_id"`
	CreatedAt string  `json:"created_at"`
}

// AdminAdjustWallet admin tarafından manuel bakiye/bloke işlemi yapar.
// action: add | subtract | block | unblock. İşlem hareket defterine ve
// denetim loguna (gerekçesiyle) aynı transaction içinde yazılır.
func (s *WalletService) AdminAdjustWallet(ctx context.Context, adminID int64, adminName string, userID int64, amount float64, action, reason string) (*models.Wallet, error) {
	amount = round2(amount)
	if moneyToCents(amount) <= 0 {
		return nil, errors.New("tutar 0'dan büyük olmalıdır")
	}
	action = strings.ToLower(strings.TrimSpace(action))
	if action != "add" && action != "subtract" && action != "block" && action != "unblock" {
		return nil, errors.New("geçersiz işlem: add, subtract, block veya unblock olmalıdır")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var w models.Wallet
	err = tx.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, blocked_balance, updated_at
		 FROM wallets WHERE user_id = $1 FOR UPDATE`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.TotalEarned, &w.TotalWithdrawn, &w.ChipBalance, &w.BlockedBalance, &w.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrWalletNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("cüzdan okunamadı: %w", err)
	}

	txType := "manual_" + action
	switch action {
	case "add":
		if _, err := tx.Exec(ctx,
			`UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`, amount, w.ID); err != nil {
			return nil, fmt.Errorf("bakiye eklenemedi: %w", err)
		}
	case "subtract":
		if moneyToCents(w.Balance) < moneyToCents(amount) {
			return nil, ErrInsufficientBalance
		}
		if _, err := tx.Exec(ctx,
			`UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`, amount, w.ID); err != nil {
			return nil, fmt.Errorf("bakiye düşülemedi: %w", err)
		}
	case "block":
		if _, err := tx.Exec(ctx,
			`UPDATE wallets SET blocked_balance = blocked_balance + $1, updated_at = NOW() WHERE id = $2`, amount, w.ID); err != nil {
			return nil, fmt.Errorf("bloke eklenemedi: %w", err)
		}
	case "unblock":
		if moneyToCents(w.BlockedBalance) < moneyToCents(amount) {
			return nil, errors.New("yetersiz bloke bakiye")
		}
		if _, err := tx.Exec(ctx,
			`UPDATE wallets SET blocked_balance = blocked_balance - $1, updated_at = NOW() WHERE id = $2`, amount, w.ID); err != nil {
			return nil, fmt.Errorf("bloke kaldırılamadı: %w", err)
		}
	}

	var reasonPtr *string
	if reason != "" {
		r := reason
		reasonPtr = &r
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_transactions (wallet_id, amount, type, reason, admin_id)
		VALUES ($1, $2, $3, $4, $5)`, w.ID, amount, txType, reasonPtr, adminID); err != nil {
		return nil, fmt.Errorf("cüzdan hareketi yazılamadı: %w", err)
	}

	if err := logInTx(ctx, tx, adminID, adminName, "wallet_adjust", "user", &userID, reason, map[string]any{
		"amount": amount,
		"action": action,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{
		"user_id": userID,
		"amount":  amount,
		"action":  action,
		"admin":   adminID,
	}).Info("Admin cüzdan işlemi uygulandı")

	return s.GetWalletByUserID(ctx, userID)
}

// ListWalletTransactions cüzdan hareket defterini döndürür (admin).
func (s *WalletService) ListWalletTransactions(ctx context.Context, userID int64, limit, offset int) ([]WalletTransaction, error) {
	wallet, err := s.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.Query(ctx, `
		SELECT id, wallet_id, amount, type, reason, admin_id, created_at
		FROM wallet_transactions
		WHERE wallet_id = $1
		ORDER BY id DESC LIMIT $2 OFFSET $3`, wallet.ID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("cüzdan hareketleri listelenemedi: %w", err)
	}
	defer rows.Close()

	txs := make([]WalletTransaction, 0)
	for rows.Next() {
		var t WalletTransaction
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.WalletID, &t.Amount, &t.Type, &t.Reason, &t.AdminID, &createdAt); err != nil {
			return nil, fmt.Errorf("cüzdan hareketi okunamadı: %w", err)
		}
		t.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		txs = append(txs, t)
	}
	return txs, rows.Err()
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

// TransferWallet iki üye arasında bakiye transferi yapar (admin, denetim loglu).
func (s *WalletService) TransferWallet(ctx context.Context, adminID int64, adminName string, fromUserID, toUserID int64, amount float64, reason string) error {
	amount = round2(amount)
	if moneyToCents(amount) <= 0 {
		return errors.New("tutar 0'dan büyük olmalıdır")
	}
	if fromUserID == toUserID {
		return errors.New("gönderen ve alıcı aynı olamaz")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var fromW, toW models.Wallet
	if err := tx.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, blocked_balance, updated_at
		 FROM wallets WHERE user_id = $1 FOR UPDATE`, fromUserID).
		Scan(&fromW.ID, &fromW.UserID, &fromW.Balance, &fromW.TotalEarned, &fromW.TotalWithdrawn, &fromW.ChipBalance, &fromW.BlockedBalance, &fromW.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWalletNotFound
		}
		return fmt.Errorf("gönderen cüzdan okunamadı: %w", err)
	}
	if moneyToCents(fromW.Balance) < moneyToCents(amount) {
		return ErrInsufficientBalance
	}
	if err := tx.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, blocked_balance, updated_at
		 FROM wallets WHERE user_id = $1 FOR UPDATE`, toUserID).
		Scan(&toW.ID, &toW.UserID, &toW.Balance, &toW.TotalEarned, &toW.TotalWithdrawn, &toW.ChipBalance, &toW.BlockedBalance, &toW.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWalletNotFound
		}
		return fmt.Errorf("alıcı cüzdan okunamadı: %w", err)
	}

	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`, amount, fromW.ID); err != nil {
		return fmt.Errorf("gönderen bakiye düşülemedi: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`, amount, toW.ID); err != nil {
		return fmt.Errorf("alıcı bakiye eklenemedi: %w", err)
	}

	var reasonPtr *string
	if reason != "" {
		r := reason
		reasonPtr = &r
	}
	neg := -amount
	if _, err := tx.Exec(ctx,
		`INSERT INTO wallet_transactions (wallet_id, amount, type, reason, admin_id) VALUES ($1,$2,'transfer_out',$3,$4)`,
		fromW.ID, neg, reasonPtr, adminID); err != nil {
		return fmt.Errorf("gönderen hareket yazılamadı: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO wallet_transactions (wallet_id, amount, type, reason, admin_id) VALUES ($1,$2,'transfer_in',$3,$4)`,
		toW.ID, amount, reasonPtr, adminID); err != nil {
		return fmt.Errorf("alıcı hareket yazılamadı: %w", err)
	}

	fromID := fromUserID
	if err := logInTx(ctx, tx, adminID, adminName, "wallet_transfer", "user", &fromID, reason, map[string]any{
		"from": fromUserID, "to": toUserID, "amount": amount,
	}); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}
	return nil
}

// TransferLog iç transfer hareketini kullanıcı bilgisiyle temsil eder.
type TransferLog struct {
	ID        int64   `json:"id"`
	UserID    int64   `json:"user_id"`
	UserName  string  `json:"user_name"`
	Amount    float64 `json:"amount"`
	Type      string  `json:"type"`
	Reason    *string `json:"reason"`
	CreatedAt string  `json:"created_at"`
}

// ListTransfers iç transfer hareketlerini (transfer_in/transfer_out) döndürür.
func (s *WalletService) ListTransfers(ctx context.Context, limit, offset int) ([]TransferLog, int64, error) {
	var total int64
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM wallet_transactions WHERE type IN ('transfer_in','transfer_out')`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("transferler sayılamadı: %w", err)
	}
	rows, err := s.db.Query(ctx, `
		SELECT wt.id, w.user_id, u.name, wt.amount, wt.type, wt.reason, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		JOIN users u ON u.id = w.user_id
		WHERE wt.type IN ('transfer_in','transfer_out')
		ORDER BY wt.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("transferler listelenemedi: %w", err)
	}
	defer rows.Close()

	out := make([]TransferLog, 0)
	for rows.Next() {
		var t TransferLog
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.UserID, &t.UserName, &t.Amount, &t.Type, &t.Reason, &createdAt); err != nil {
			return nil, 0, fmt.Errorf("transfer okunamadı: %w", err)
		}
		t.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		out = append(out, t)
	}
	return out, total, rows.Err()
}
