package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// BinaryTransactionService binary bacak hareketlerini yönetir.
type BinaryTransactionService struct {
	db *pgxpool.Pool
}

// NewBinaryTransactionService yeni bir BinaryTransactionService örneği döndürür.
func NewBinaryTransactionService(db *pgxpool.Pool) *BinaryTransactionService {
	return &BinaryTransactionService{db: db}
}

// AddBinaryTransaction bir bacak hareketi kaydı ekler.
// Transaction içinde çalışabilmesi için DBTX arayüzü kullanılır.
func AddBinaryTransaction(ctx context.Context, q DBTX, userID int64, position, transactionType string, pv, cv int64, description string, relatedOrderID *int64) error {
	if position != "L" && position != "R" {
		return errors.New("geçersiz pozisyon: L veya R olmalıdır")
	}
	if transactionType != "add" && transactionType != "deduct" && transactionType != "reset" {
		return errors.New("geçersiz işlem tipi: add, deduct veya reset olmalıdır")
	}

	var desc *string
	if description != "" {
		desc = &description
	}

	if _, err := q.Exec(ctx,
		`INSERT INTO binary_transactions (user_id, position, transaction_type, pv, cv, description, related_order_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		userID, position, transactionType, pv, cv, desc, relatedOrderID); err != nil {
		return fmt.Errorf("binary hareket kaydı eklenemedi: %w", err)
	}
	return nil
}

const binaryTransactionColumns = `id, user_id, position, transaction_type, pv, cv, description, related_order_id, created_at`

// ListBinaryTransactions kullanıcının kendi bacak hareketlerini filtreli ve sayfalı döndürür.
func (s *BinaryTransactionService) ListBinaryTransactions(ctx context.Context, userID int64, position, transactionType string, limit, offset int) ([]models.BinaryTransaction, int64, error) {
	return s.list(ctx, "WHERE user_id = $1", []interface{}{userID}, position, transactionType, limit, offset)
}

// ListAllBinaryTransactions tüm kullanıcıların hareketlerini döndürür (admin).
func (s *BinaryTransactionService) ListAllBinaryTransactions(ctx context.Context, position, transactionType string, limit, offset int) ([]models.BinaryTransaction, int64, error) {
	return s.list(ctx, "WHERE 1=1", []interface{}{}, position, transactionType, limit, offset)
}

func (s *BinaryTransactionService) list(ctx context.Context, baseWhere string, baseArgs []interface{}, position, transactionType string, limit, offset int) ([]models.BinaryTransaction, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	where := baseWhere
	args := append([]interface{}{}, baseArgs...)

	if position != "" {
		args = append(args, position)
		where += fmt.Sprintf(` AND position = $%d`, len(args))
	}
	if transactionType != "" {
		args = append(args, transactionType)
		where += fmt.Sprintf(` AND transaction_type = $%d`, len(args))
	}

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM binary_transactions `+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("hareket sayısı okunamadı: %w", err)
	}

	args = append(args, limit, offset)
	query := `SELECT ` + binaryTransactionColumns + ` FROM binary_transactions ` + where +
		fmt.Sprintf(` ORDER BY id DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("hareketler listelenemedi: %w", err)
	}
	defer rows.Close()

	items := make([]models.BinaryTransaction, 0)
	for rows.Next() {
		var t models.BinaryTransaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.Position, &t.TransactionType, &t.PV, &t.CV,
			&t.Description, &t.RelatedOrderID, &t.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("hareket okunamadı: %w", err)
		}
		items = append(items, t)
	}

	return items, total, rows.Err()
}
