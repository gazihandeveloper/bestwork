package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// ErrCategoryNotFound kategori bulunamadığında döndürülür.
var ErrCategoryNotFound = errors.New("kategori bulunamadı")

// ErrCategoryDuplicate benzersiz slug çakışması çözülemediğinde döndürülür.
var ErrCategoryDuplicate = errors.New("kategori slug değeri benzersiz olmalıdır")

// CategoryService kategori CRUD işlemlerini yürütür.
type CategoryService struct {
	db *pgxpool.Pool
}

// NewCategoryService yeni bir CategoryService örneği döndürür.
func NewCategoryService(db *pgxpool.Pool) *CategoryService {
	return &CategoryService{db: db}
}

const categoryColumns = `id, name, slug, icon, description, sort_order, is_active, created_at`

// scanCategory tek satırı models.Category'a dönüştürür.
func scanCategory(row pgx.Row) (*models.Category, error) {
	var c models.Category
	if err := row.Scan(&c.ID, &c.Name, &c.Slug, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCategoryNotFound
		}
		return nil, fmt.Errorf("kategori okunamadı: %w", err)
	}
	return &c, nil
}

// List kategorileri döndürür. all=true ise tümü, aksi halde yalnızca aktifler (herkese açık).
func (s *CategoryService) List(ctx context.Context, all bool) ([]models.Category, error) {
	query := `SELECT ` + categoryColumns + ` FROM categories`
	if !all {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY sort_order ASC, id ASC`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("kategoriler listelenemedi: %w", err)
	}
	defer rows.Close()

	categories := make([]models.Category, 0)
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("kategori okunamadı: %w", err)
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

// GetByID ID'ye göre kategoriyi döndürür.
func (s *CategoryService) GetByID(ctx context.Context, id int64) (*models.Category, error) {
	return scanCategory(s.db.QueryRow(ctx, `SELECT `+categoryColumns+` FROM categories WHERE id = $1`, id))
}

// Create yeni kategori ekler. Slug verilmezse ad üzerinden türetilir; sonuç boşsa
// veya benzersizlik çakışması olursa rastgele sonek eklenir (slug UNIQUE constraint).
func (s *CategoryService) Create(ctx context.Context, name, slug, icon, description string, sortOrder int, isActive bool) (*models.Category, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("kategori adı zorunludur")
	}
	if icon = strings.TrimSpace(icon); icon == "" {
		icon = "tag"
	}
	if slug = strings.TrimSpace(slug); slug == "" {
		slug = slugify(name)
	}
	if slug == "" {
		slug = "kategori-" + randomSuffix()
	}

	var desc *string
	if d := strings.TrimSpace(description); d != "" {
		desc = &d
	}

	c := &models.Category{
		Name:        name,
		Slug:        &slug,
		Icon:        icon,
		Description: desc,
		SortOrder:   sortOrder,
		IsActive:    isActive,
	}

	// Slug çakışmasında rastgele sonek ekleyerek yeniden dener.
	for attempt := 0; attempt < 5; attempt++ {
		err := s.db.QueryRow(ctx,
			`INSERT INTO categories (name, slug, icon, description, sort_order, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
			c.Name, c.Slug, c.Icon, c.Description, c.SortOrder, c.IsActive).
			Scan(&c.ID, &c.CreatedAt)
		if err == nil {
			return c, nil
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			// UNIQUE ihlali yalnızca slug'ta olabilir (name UNIQUE değil).
			suffix := slug + "-" + randomSuffix()
			c.Slug = &suffix
			continue
		}
		return nil, fmt.Errorf("kategori eklenemedi: %w", err)
	}
	return nil, ErrCategoryDuplicate
}

// Update kategorinin değişebilir alanlarını günceller.
func (s *CategoryService) Update(ctx context.Context, c *models.Category) error {
	if c.Name = strings.TrimSpace(c.Name); c.Name == "" {
		return errors.New("kategori adı zorunludur")
	}
	if c.Icon = strings.TrimSpace(c.Icon); c.Icon == "" {
		c.Icon = "tag"
	}
	if c.Slug != nil {
		slug := strings.TrimSpace(*c.Slug)
		if slug == "" {
			slug = slugify(c.Name)
		}
		if slug == "" {
			slug = "kategori-" + randomSuffix()
		}
		c.Slug = &slug
	}

	tag, err := s.db.Exec(ctx,
		`UPDATE categories SET name = $1, slug = $2, icon = $3, description = $4, sort_order = $5, is_active = $6 WHERE id = $7`,
		c.Name, c.Slug, c.Icon, c.Description, c.SortOrder, c.IsActive, c.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return fmt.Errorf("%w: %s", ErrCategoryDuplicate, *c.Slug)
		}
		return fmt.Errorf("kategori güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}
	return nil
}

// Delete kategorisini siler. Ürünler bu kategoriyi referans ediyorsa
// products.category_id ON DELETE SET NULL ile NULL'a düşer.
func (s *CategoryService) Delete(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("kategori silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}
	return nil
}

// slugReplacer Türkçe karakterleri ASCII karşılıklarına çevirir.
var slugReplacer = strings.NewReplacer(
	"ç", "c", "ğ", "g", "ı", "i", "ö", "o", "ş", "s", "ü", "u",
	"Ç", "c", "Ğ", "g", "İ", "i", "Ö", "o", "Ş", "s", "Ü", "u",
)

// slugify adından slug üretir: lowercase, Türkçe karakter çevirisi,
// boşluk/özel karakterler tireye dönüştürülür. Boş sonuç dönebilir.
func slugify(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	name = slugReplacer.Replace(name)

	var b strings.Builder
	lastDash := false
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}

// randomSuffix benzersiz slug çakışmalarını çözmek için kısa rastgele sonek üretir.
func randomSuffix() string {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		// rand.Read pratikte başarısız olmaz; yine de deterministik olmayan bir
		// zaman tabanlı sonek ile devam edilir.
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}
