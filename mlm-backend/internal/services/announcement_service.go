package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// ErrAnnouncementNotFound duyuru bulunamadığında döner.
var ErrAnnouncementNotFound = errors.New("duyuru bulunamadı")

// AnnouncementService duyuru/bildirim işlemlerini yönetir.
type AnnouncementService struct {
	db *pgxpool.Pool
}

func NewAnnouncementService(db *pgxpool.Pool) *AnnouncementService {
	return &AnnouncementService{db: db}
}

const announcementColumns = `id, title, body, audience, is_active, created_at`

func scanAnnouncement(row pgx.Row) (*models.Announcement, error) {
	var a models.Announcement
	if err := row.Scan(&a.ID, &a.Title, &a.Body, &a.Audience, &a.IsActive, &a.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAnnouncementNotFound
		}
		return nil, err
	}
	return &a, nil
}

// ListActive aktif duyuruları döndürür (herkese açık).
func (s *AnnouncementService) ListActive(ctx context.Context, audience string) ([]models.Announcement, error) {
	query := `SELECT ` + announcementColumns + ` FROM announcements WHERE is_active = TRUE`
	args := []any{}
	if audience != "" {
		query += ` AND (audience = $1 OR audience = 'all')`
		args = append(args, audience)
	}
	query += ` ORDER BY id DESC LIMIT 50`
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("duyurular listelenemedi: %w", err)
	}
	defer rows.Close()

	out := make([]models.Announcement, 0)
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &a.Audience, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// ListAll tüm duyuruları döndürür (admin).
func (s *AnnouncementService) ListAll(ctx context.Context) ([]models.Announcement, error) {
	rows, err := s.db.Query(ctx, `SELECT `+announcementColumns+` FROM announcements ORDER BY id DESC LIMIT 200`)
	if err != nil {
		return nil, fmt.Errorf("duyurular listelenemedi: %w", err)
	}
	defer rows.Close()

	out := make([]models.Announcement, 0)
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &a.Audience, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// Create yeni duyuru ekler.
func (s *AnnouncementService) Create(ctx context.Context, title, body, audience string, isActive bool) (*models.Announcement, error) {
	if title == "" || body == "" {
		return nil, errors.New("başlık ve içerik zorunludur")
	}
	if audience == "" {
		audience = "all"
	}
	a := &models.Announcement{Title: title, Body: body, Audience: audience, IsActive: isActive}
	err := s.db.QueryRow(ctx,
		`INSERT INTO announcements (title, body, audience, is_active) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		a.Title, a.Body, a.Audience, a.IsActive).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("duyuru eklenemedi: %w", err)
	}
	return a, nil
}

// Update duyuruyu günceller.
func (s *AnnouncementService) Update(ctx context.Context, a *models.Announcement) error {
	if a.Title == "" || a.Body == "" {
		return errors.New("başlık ve içerik zorunludur")
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE announcements SET title = $1, body = $2, audience = $3, is_active = $4 WHERE id = $5`,
		a.Title, a.Body, a.Audience, a.IsActive, a.ID)
	if err != nil {
		return fmt.Errorf("duyuru güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAnnouncementNotFound
	}
	return nil
}

// Delete duyuruyu siler.
func (s *AnnouncementService) Delete(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM announcements WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("duyuru silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAnnouncementNotFound
	}
	return nil
}
