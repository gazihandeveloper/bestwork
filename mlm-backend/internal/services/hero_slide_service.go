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

// ErrHeroSlideNotFound slider kaydı bulunamadığında döndürülür.
var ErrHeroSlideNotFound = errors.New("slider kaydı bulunamadı")

// HeroSlideService ana sayfa slider CRUD işlemlerini yürütür.
type HeroSlideService struct {
	db *pgxpool.Pool
}

// NewHeroSlideService yeni bir HeroSlideService örneği döndürür.
func NewHeroSlideService(db *pgxpool.Pool) *HeroSlideService {
	return &HeroSlideService{db: db}
}

const heroSlideColumns = `id, title, subtitle, description, image_path, link, primary_button_text, primary_button_link, secondary_button_text, secondary_button_link, show_buttons, sort_order, is_active, created_at`

func scanHeroSlide(row pgx.Row) (*models.HeroSlide, error) {
	var s models.HeroSlide
	if err := row.Scan(&s.ID, &s.Title, &s.Subtitle, &s.Description, &s.ImagePath, &s.Link,
		&s.PrimaryButtonText, &s.PrimaryButtonLink, &s.SecondaryButtonText, &s.SecondaryButtonLink,
		&s.ShowButtons, &s.SortOrder, &s.IsActive, &s.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHeroSlideNotFound
		}
		return nil, fmt.Errorf("slider okunamadı: %w", err)
	}
	return &s, nil
}

// CreateSlide yeni slider kaydı ekler.
func (s *HeroSlideService) CreateSlide(ctx context.Context, slide *models.HeroSlide) (*models.HeroSlide, error) {
	slide.Title = strings.TrimSpace(slide.Title)
	slide.ImagePath = strings.TrimSpace(slide.ImagePath)
	if slide.Title == "" || slide.ImagePath == "" {
		return nil, errors.New("başlık ve görsel yolu zorunludur")
	}

	err := s.db.QueryRow(ctx,
		`INSERT INTO hero_slides (title, subtitle, description, image_path, link,
			primary_button_text, primary_button_link, secondary_button_text, secondary_button_link, show_buttons,
			sort_order, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, created_at`,
		slide.Title, slide.Subtitle, slide.Description, slide.ImagePath, slide.Link,
		slide.PrimaryButtonText, slide.PrimaryButtonLink, slide.SecondaryButtonText, slide.SecondaryButtonLink,
		slide.ShowButtons, slide.SortOrder, slide.IsActive).
		Scan(&slide.ID, &slide.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("slider eklenemedi: %w", err)
	}
	return slide, nil
}

// GetSlideByID ID'ye göre slider kaydını döndürür.
func (s *HeroSlideService) GetSlideByID(ctx context.Context, id int64) (*models.HeroSlide, error) {
	return scanHeroSlide(s.db.QueryRow(ctx, `SELECT `+heroSlideColumns+` FROM hero_slides WHERE id = $1`, id))
}

// ListActive yalnızca aktif kayıtları sıralı döndürür (herkese açık).
func (s *HeroSlideService) ListActive(ctx context.Context) ([]models.HeroSlide, error) {
	return s.list(ctx, `WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC`)
}

// ListAll tüm kayıtları döndürür (admin).
func (s *HeroSlideService) ListAll(ctx context.Context) ([]models.HeroSlide, error) {
	return s.list(ctx, `ORDER BY sort_order ASC, id ASC`)
}

func (s *HeroSlideService) list(ctx context.Context, where string) ([]models.HeroSlide, error) {
	rows, err := s.db.Query(ctx, `SELECT `+heroSlideColumns+` FROM hero_slides `+where)
	if err != nil {
		return nil, fmt.Errorf("sliderlar listelenemedi: %w", err)
	}
	defer rows.Close()

	slides := make([]models.HeroSlide, 0)
	for rows.Next() {
		var sl models.HeroSlide
		if err := rows.Scan(&sl.ID, &sl.Title, &sl.Subtitle, &sl.Description, &sl.ImagePath, &sl.Link,
			&sl.PrimaryButtonText, &sl.PrimaryButtonLink, &sl.SecondaryButtonText, &sl.SecondaryButtonLink,
			&sl.ShowButtons, &sl.SortOrder, &sl.IsActive, &sl.CreatedAt); err != nil {
			return nil, fmt.Errorf("slider okunamadı: %w", err)
		}
		slides = append(slides, sl)
	}
	return slides, rows.Err()
}

// UpdateSlide slider kaydını günceller.
func (s *HeroSlideService) UpdateSlide(ctx context.Context, slide *models.HeroSlide) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE hero_slides SET title = $1, subtitle = $2, description = $3, image_path = $4, link = $5,
			primary_button_text = $6, primary_button_link = $7, secondary_button_text = $8, secondary_button_link = $9,
			show_buttons = $10, sort_order = $11, is_active = $12
		 WHERE id = $13`,
		slide.Title, slide.Subtitle, slide.Description, slide.ImagePath, slide.Link,
		slide.PrimaryButtonText, slide.PrimaryButtonLink, slide.SecondaryButtonText, slide.SecondaryButtonLink,
		slide.ShowButtons, slide.SortOrder, slide.IsActive, slide.ID)
	if err != nil {
		return fmt.Errorf("slider güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrHeroSlideNotFound
	}
	return nil
}

// DeleteSlide slider kaydını siler.
func (s *HeroSlideService) DeleteSlide(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM hero_slides WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("slider silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrHeroSlideNotFound
	}
	return nil
}
