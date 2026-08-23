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

// ErrBenefitNotFound avantaj kartı bulunamadığında döndürülür.
var ErrBenefitNotFound = errors.New("avantaj kartı bulunamadı")

// BenefitService anasayfa avantaj kartı CRUD işlemlerini yürütür.
type BenefitService struct {
	db *pgxpool.Pool
}

// NewBenefitService yeni bir BenefitService örneği döndürür.
func NewBenefitService(db *pgxpool.Pool) *BenefitService {
	return &BenefitService{db: db}
}

const benefitColumns = `id, title, description, icon, sort_order, is_active, created_at`

func scanBenefit(row pgx.Row) (*models.Benefit, error) {
	var b models.Benefit
	if err := row.Scan(&b.ID, &b.Title, &b.Description, &b.Icon, &b.SortOrder, &b.IsActive, &b.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBenefitNotFound
		}
		return nil, fmt.Errorf("avantaj kartı okunamadı: %w", err)
	}
	return &b, nil
}

// CreateBenefit yeni avantaj kartı ekler.
func (s *BenefitService) CreateBenefit(ctx context.Context, title, description, icon string, sortOrder int, isActive bool) (*models.Benefit, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	icon = strings.TrimSpace(icon)
	if title == "" || description == "" {
		return nil, errors.New("başlık ve açıklama zorunludur")
	}
	if icon == "" {
		icon = "shipping"
	}

	b := &models.Benefit{
		Title:       title,
		Description: description,
		Icon:        icon,
		SortOrder:   sortOrder,
		IsActive:    isActive,
	}

	err := s.db.QueryRow(ctx,
		`INSERT INTO benefits (title, description, icon, sort_order, is_active)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		b.Title, b.Description, b.Icon, b.SortOrder, b.IsActive).
		Scan(&b.ID, &b.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("avantaj kartı eklenemedi: %w", err)
	}
	return b, nil
}

// GetBenefitByID ID'ye göre avantaj kartını döndürür.
func (s *BenefitService) GetBenefitByID(ctx context.Context, id int64) (*models.Benefit, error) {
	return scanBenefit(s.db.QueryRow(ctx, `SELECT `+benefitColumns+` FROM benefits WHERE id = $1`, id))
}

// ListActive yalnızca aktif kartları sıralı döndürür (herkese açık).
func (s *BenefitService) ListActive(ctx context.Context) ([]models.Benefit, error) {
	return s.list(ctx, `WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`)
}

// ListAll tüm kartları döndürür (admin).
func (s *BenefitService) ListAll(ctx context.Context) ([]models.Benefit, error) {
	return s.list(ctx, `ORDER BY sort_order ASC, id ASC`)
}

func (s *BenefitService) list(ctx context.Context, where string) ([]models.Benefit, error) {
	rows, err := s.db.Query(ctx, `SELECT `+benefitColumns+` FROM benefits `+where)
	if err != nil {
		return nil, fmt.Errorf("avantaj kartları listelenemedi: %w", err)
	}
	defer rows.Close()

	benefits := make([]models.Benefit, 0)
	for rows.Next() {
		var b models.Benefit
		if err := rows.Scan(&b.ID, &b.Title, &b.Description, &b.Icon, &b.SortOrder, &b.IsActive, &b.CreatedAt); err != nil {
			return nil, fmt.Errorf("avantaj kartı okunamadı: %w", err)
		}
		benefits = append(benefits, b)
	}
	return benefits, rows.Err()
}

// UpdateBenefit avantaj kartını günceller.
func (s *BenefitService) UpdateBenefit(ctx context.Context, b *models.Benefit) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE benefits SET title = $1, description = $2, icon = $3, sort_order = $4, is_active = $5 WHERE id = $6`,
		b.Title, b.Description, b.Icon, b.SortOrder, b.IsActive, b.ID)
	if err != nil {
		return fmt.Errorf("avantaj kartı güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBenefitNotFound
	}
	return nil
}

// DeleteBenefit avantaj kartını siler.
func (s *BenefitService) DeleteBenefit(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM benefits WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("avantaj kartı silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBenefitNotFound
	}
	return nil
}
