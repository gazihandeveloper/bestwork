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

const heroSlideColumns = `id, title, subtitle, image_path, link, sort_order, is_active, created_at`

func scanHeroSlide(row pgx.Row) (*models.HeroSlide, error) {
	var s models.HeroSlide
	if err := row.Scan(&s.ID, &s.Title, &s.Subtitle, &s.ImagePath, &s.Link, &s.SortOrder, &s.IsActive, &s.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrHeroSlideNotFound
		}
		return nil, fmt.Errorf("slider okunamadı: %w", err)
	}
	return &s, nil
}

// CreateSlide yeni slider kaydı ekler.
func (s *HeroSlideService) CreateSlide(ctx context.Context, title, subtitle, imagePath, link string, sortOrder int, isActive bool) (*models.HeroSlide, error) {
	title = strings.TrimSpace(title)
	imagePath = strings.TrimSpace(imagePath)
	if title == "" || imagePath == "" {
		return nil, errors.New("başlık ve görsel yolu zorunludur")
	}

	var sub, ln *string
	if v := strings.TrimSpace(subtitle); v != "" {
		sub = &v
	}
	if v := strings.TrimSpace(link); v != "" {
		ln = &v
	}

	slide := &models.HeroSlide{
		Title:     title,
		Subtitle:  sub,
		ImagePath: imagePath,
		Link:      ln,
		SortOrder: sortOrder,
		IsActive:  isActive,
	}

	err := s.db.QueryRow(ctx,
		`INSERT INTO hero_slides (title, subtitle, image_path, link, sort_order, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		slide.Title, slide.Subtitle, slide.ImagePath, slide.Link, slide.SortOrder, slide.IsActive).
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
		if err := rows.Scan(&sl.ID, &sl.Title, &sl.Subtitle, &sl.ImagePath, &sl.Link, &sl.SortOrder, &sl.IsActive, &sl.CreatedAt); err != nil {
			return nil, fmt.Errorf("slider okunamadı: %w", err)
		}
		slides = append(slides, sl)
	}
	return slides, rows.Err()
}

// UpdateSlide slider kaydını günceller.
func (s *HeroSlideService) UpdateSlide(ctx context.Context, slide *models.HeroSlide) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE hero_slides SET title = $1, subtitle = $2, image_path = $3, link = $4, sort_order = $5, is_active = $6 WHERE id = $7`,
		slide.Title, slide.Subtitle, slide.ImagePath, slide.Link, slide.SortOrder, slide.IsActive, slide.ID)
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
