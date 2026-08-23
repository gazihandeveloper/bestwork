package services

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// CommissionService komisyon geçmişi sorgularını yürütür.
type CommissionService struct {
	db *pgxpool.Pool
}

// NewCommissionService yeni bir CommissionService örneği döndürür.
func NewCommissionService(db *pgxpool.Pool) *CommissionService {
	return &CommissionService{db: db}
}

// ListUserCommissions kullanıcının komisyon geçmişini tip/durum filtreleri ve
// sayfalama ile döndürür. Toplam kayıt sayısını da verir.
func (s *CommissionService) ListUserCommissions(ctx context.Context, userID int64, commissionType, status string, limit, offset int) ([]models.Commission, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	where := ` WHERE user_id = $1`
	args := []interface{}{userID}

	if commissionType != "" {
		args = append(args, commissionType)
		where += fmt.Sprintf(` AND type = $%d`, len(args))
	}
	if status != "" {
		args = append(args, status)
		where += fmt.Sprintf(` AND status = $%d`, len(args))
	}

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM commissions`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("komisyon sayısı okunamadı: %w", err)
	}

	args = append(args, limit, offset)
	query := `SELECT id, user_id, from_user_id, type, amount, related_cv, related_order_id, status, created_at, paid_at
		FROM commissions` + where + fmt.Sprintf(` ORDER BY id DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("komisyonlar listelenemedi: %w", err)
	}
	defer rows.Close()

	commissions := make([]models.Commission, 0)
	for rows.Next() {
		var c models.Commission
		if err := rows.Scan(&c.ID, &c.UserID, &c.FromUserID, &c.Type, &c.Amount, &c.RelatedCV,
			&c.RelatedOrderID, &c.Status, &c.CreatedAt, &c.PaidAt); err != nil {
			return nil, 0, fmt.Errorf("komisyon okunamadı: %w", err)
		}
		commissions = append(commissions, c)
	}

	return commissions, total, rows.Err()
}
