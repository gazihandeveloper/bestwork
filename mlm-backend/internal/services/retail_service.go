package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// RetailService perakende (müşteri) kazanç raporlarını hazırlar.
type RetailService struct {
	db *pgxpool.Pool
}

// NewRetailService yeni bir RetailService örneği döndürür.
func NewRetailService(db *pgxpool.Pool) *RetailService {
	return &RetailService{db: db}
}

// RetailEarningsResponse perakende kazanç endpoint yanıtıdır.
type RetailEarningsResponse struct {
	Summary models.RetailSummary       `json:"summary"`
	Items   []models.RetailEarningItem `json:"items"`
	Total   int64                      `json:"total"`
	Limit   int                        `json:"limit"`
	Offset  int                        `json:"offset"`
}

// GetRetailEarnings kullanıcının perakende kazanç özetini ve detay listesini döndürür.
// month opsiyoneldir ('YYYY-MM'); verilirse yalnızca o ayki kayıtlar dikkate alınır.
func (s *RetailService) GetRetailEarnings(ctx context.Context, userID int64, month string, limit, offset int) (*RetailEarningsResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var monthStart, monthEnd *time.Time
	if month != "" {
		start, err := time.Parse("2006-01", month)
		if err != nil {
			return nil, fmt.Errorf("geçersiz ay formatı (YYYY-MM bekleniyor)")
		}
		end := start.AddDate(0, 1, 0)
		monthStart = &start
		monthEnd = &end
	}

	// Ortak filtre parçaları
	args := []interface{}{userID}
	where := ` WHERE c.user_id = $1 AND c.type = 'retail' AND c.status = 'paid'`
	if monthStart != nil {
		args = append(args, *monthStart, *monthEnd)
		where += fmt.Sprintf(` AND c.created_at >= $%d AND c.created_at < $%d`, len(args)-1, len(args))
	}

	// Özet
	summary := models.RetailSummary{}
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(c.amount), 0), COUNT(*), COALESCE(SUM(c.related_cv), 0)
		 FROM commissions c`+where, args...).
		Scan(&summary.TotalAmount, &summary.OrderCount, &summary.TotalCV); err != nil {
		return nil, fmt.Errorf("perakende kazanç özeti okunamadı: %w", err)
	}

	// Toplam kayıt sayısı
	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM commissions c`+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("perakende kayıt sayısı okunamadı: %w", err)
	}

	// Detay listesi (müşteri + sipariş bilgisiyle)
	listArgs := append(append([]interface{}{}, args...), limit, offset)
	query := `
		SELECT c.id, c.from_user_id, u.name, u.member_code, c.related_order_id,
			o.total_amount, c.related_cv, c.amount, c.created_at
		FROM commissions c
		JOIN users u ON u.id = c.from_user_id
		LEFT JOIN orders o ON o.id = c.related_order_id` + where +
		fmt.Sprintf(` ORDER BY c.id DESC LIMIT $%d OFFSET $%d`, len(listArgs)-1, len(listArgs))

	rows, err := s.db.Query(ctx, query, listArgs...)
	if err != nil {
		return nil, fmt.Errorf("perakende kazançlar listelenemedi: %w", err)
	}
	defer rows.Close()

	items := make([]models.RetailEarningItem, 0)
	for rows.Next() {
		var it models.RetailEarningItem
		if err := rows.Scan(&it.CommissionID, &it.CustomerID, &it.CustomerName, &it.CustomerMemberCode,
			&it.OrderID, &it.OrderAmount, &it.RelatedCV, &it.Amount, &it.CreatedAt); err != nil {
			return nil, fmt.Errorf("perakende kaydı okunamadı: %w", err)
		}
		items = append(items, it)
	}

	return &RetailEarningsResponse{
		Summary: summary,
		Items:   items,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	}, rows.Err()
}
