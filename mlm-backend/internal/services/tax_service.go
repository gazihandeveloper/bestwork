package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// ErrTaxNotFound vergi tanımı bulunamadığında döndürülür.
var ErrTaxNotFound = errors.New("vergi bulunamadı")

// TaxService vergi (KDV) tanımlarını yönetir.
type TaxService struct {
	db *pgxpool.Pool
}

// NewTaxService yeni bir TaxService örneği döndürür.
func NewTaxService(db *pgxpool.Pool) *TaxService {
	return &TaxService{db: db}
}

const taxColumns = `id, title, rate, sort_order, status, created_at, updated_at`

func scanTax(row pgx.Row) (*models.Tax, error) {
	var t models.Tax
	if err := row.Scan(&t.ID, &t.Title, &t.Rate, &t.SortOrder, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTaxNotFound
		}
		return nil, fmt.Errorf("vergi okunamadı: %w", err)
	}
	return &t, nil
}

// List vergileri sıralama önceliğine göre döndürür. onlyActive=true ise yalnız "active".
func (s *TaxService) List(ctx context.Context, onlyActive bool) ([]models.Tax, error) {
	query := `SELECT ` + taxColumns + ` FROM taxes`
	if onlyActive {
		query += ` WHERE status = 'active'`
	}
	query += ` ORDER BY sort_order ASC, id ASC`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("vergiler listelenemedi: %w", err)
	}
	defer rows.Close()

	taxes := make([]models.Tax, 0)
	for rows.Next() {
		var t models.Tax
		if err := rows.Scan(&t.ID, &t.Title, &t.Rate, &t.SortOrder, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("vergi okunamadı: %w", err)
		}
		taxes = append(taxes, t)
	}
	return taxes, rows.Err()
}

// GetByID ID'ye göre vergi döndürür.
func (s *TaxService) GetByID(ctx context.Context, id int64) (*models.Tax, error) {
	return scanTax(s.db.QueryRow(ctx, `SELECT `+taxColumns+` FROM taxes WHERE id = $1`, id))
}

// validTaxStatus durum değerlerini doğrular.
func validTaxStatus(st string) bool {
	return st == "active" || st == "draft" || st == "pending"
}

// Create yeni vergi ekler.
func (s *TaxService) Create(ctx context.Context, title string, rate float64, sortOrder int, status string) (*models.Tax, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errors.New("vergi başlığı zorunludur")
	}
	if rate < 0 {
		return nil, errors.New("vergi oranı negatif olamaz")
	}
	if status = strings.TrimSpace(status); status == "" {
		status = "active"
	}
	if !validTaxStatus(status) {
		return nil, errors.New("geçersiz durum")
	}

	t := &models.Tax{Title: title, Rate: rate, SortOrder: sortOrder, Status: status}
	err := s.db.QueryRow(ctx,
		`INSERT INTO taxes (title, rate, sort_order, status) VALUES ($1, $2, $3, $4)
		 RETURNING id, created_at, updated_at`,
		t.Title, t.Rate, t.SortOrder, t.Status).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("vergi eklenemedi: %w", err)
	}
	return t, nil
}

// Update vergi tanımını günceller.
func (s *TaxService) Update(ctx context.Context, id int64, title string, rate float64, sortOrder int, status string) (*models.Tax, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, errors.New("vergi başlığı zorunludur")
	}
	if rate < 0 {
		return nil, errors.New("vergi oranı negatif olamaz")
	}
	if !validTaxStatus(status) {
		return nil, errors.New("geçersiz durum")
	}

	tag, err := s.db.Exec(ctx,
		`UPDATE taxes SET title = $1, rate = $2, sort_order = $3, status = $4, updated_at = NOW() WHERE id = $5`,
		title, rate, sortOrder, status, id)
	if err != nil {
		return nil, fmt.Errorf("vergi güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrTaxNotFound
	}
	return s.GetByID(ctx, id)
}

// Delete vergiyi siler (kategori referansı SET NULL olur).
func (s *TaxService) Delete(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM taxes WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("vergi silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrTaxNotFound
	}
	return nil
}

// RateForUserProduct, sipariş kalemi için ürünün kategorisine atanmış AKTİF
// vergiyi (id + oran) döndürür. Kategori/vergi yoksa (0, 0) döner.
func (s *TaxService) RateForCategory(ctx context.Context, q DBTX, categoryID *int64) (int64, float64, error) {
	if categoryID == nil {
		return 0, 0, nil
	}
	var id *int64
	var rate *float64
	err := q.QueryRow(ctx, `
		SELECT t.id, t.rate
		FROM categories c
		JOIN taxes t ON t.id = c.tax_id AND t.status = 'active'
		WHERE c.id = $1`, *categoryID).Scan(&id, &rate)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, fmt.Errorf("vergi okunamadı: %w", err)
	}
	if id == nil || rate == nil {
		return 0, 0, nil
	}
	return *id, *rate, nil
}
