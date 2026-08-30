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

// ProductService ürün CRUD işlemlerini yürütür.
type ProductService struct {
	db *pgxpool.Pool
}

// NewProductService yeni bir ProductService örneği döndürür.
func NewProductService(db *pgxpool.Pool) *ProductService {
	return &ProductService{db: db}
}

// productColumns sütun sırası scanProduct ile birebir aynı olmalıdır:
// (id,name,price,pv,cv,stock,description,image_path,category,category_id,category_name,sku,created_at)
// Kategori adı categories tablosundan LEFT JOIN ile gelir (category_name).
const productColumns = `p.id, p.name, p.price, p.pv, p.cv, p.stock, p.description, p.image_path, p.category, p.category_id, c.name AS category_name, p.sku, p.created_at`

// productJoin kategori adını ürün satırına ekler.
const productJoin = ` FROM products p LEFT JOIN categories c ON c.id = p.category_id`

// scanProduct tek satırı models.Product'a dönüştürür.
func scanProduct(row pgx.Row) (*models.Product, error) {
	var p models.Product
	if err := row.Scan(&p.ID, &p.Name, &p.Price, &p.PV, &p.CV, &p.Stock, &p.Description, &p.ImagePath, &p.Category, &p.CategoryID, &p.CategoryName, &p.SKU, &p.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProductNotFound
		}
		return nil, fmt.Errorf("ürün okunamadı: %w", err)
	}
	return &p, nil
}

// CreateProduct yeni ürün ekler.
func (s *ProductService) CreateProduct(ctx context.Context, name, description, imagePath, category, sku string, price float64, pv, cv int64, stock int, categoryID *int64) (*models.Product, error) {
	name = strings.TrimSpace(name)
	if name == "" || price <= 0 || pv < 0 || cv < 0 || stock < 0 {
		return nil, errors.New("geçersiz ürün bilgileri: ad boş olamaz, fiyat > 0 ve PV/CV/stok >= 0 olmalıdır")
	}

	var desc, img, cat, sk *string
	if k := strings.TrimSpace(sku); k != "" {
		sk = &k
	}
	if d := strings.TrimSpace(description); d != "" {
		desc = &d
	}
	if i := strings.TrimSpace(imagePath); i != "" {
		img = &i
	}
	if c := strings.TrimSpace(category); c != "" {
		cat = &c
	}

	p := &models.Product{
		Name:        name,
		Price:       price,
		PV:          pv,
		CV:          cv,
		Stock:       stock,
		Description: desc,
		ImagePath:   img,
		Category:    cat,
		CategoryID:  categoryID,
		SKU:         sk,
	}

	err := s.db.QueryRow(ctx,
		`INSERT INTO products (name, price, pv, cv, stock, description, image_path, category, category_id, sku)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at`,
		p.Name, p.Price, p.PV, p.CV, p.Stock, p.Description, p.ImagePath, p.Category, p.CategoryID, p.SKU).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ürün eklenemedi: %w", err)
	}

	// SKU verilmediyse otomatik üret: BW-001, BW-002 ...
	if p.SKU == nil {
		generated := fmt.Sprintf("BW-%03d", p.ID)
		if _, err := s.db.Exec(ctx, `UPDATE products SET sku = $1 WHERE id = $2`, generated, p.ID); err != nil {
			return nil, fmt.Errorf("stok kodu üretilemedi: %w", err)
		}
		p.SKU = &generated
	}

	// category_name JOIN ile geldiği için oluşturulan kaydı yeniden okuyarak
	// tam Product JSON'u döndür.
	created, err := s.GetProductByID(ctx, p.ID)
	if err != nil {
		return nil, fmt.Errorf("ürün oluşturuldu ancak okunamadı: %w", err)
	}
	return created, nil
}

// GetProductByID ID'ye göre ürünü döndürür.
func (s *ProductService) GetProductByID(ctx context.Context, id int64) (*models.Product, error) {
	return scanProduct(s.db.QueryRow(ctx, `SELECT `+productColumns+productJoin+` WHERE p.id = $1`, id))
}

// ListProducts tüm ürünleri döndürür. q verilirse ad veya stok koduna göre filtreler
// (unaccent ile Türkçe karakter duyarsız; sku NULL olabilir, COALESCE kullanılır).
func (s *ProductService) ListProducts(ctx context.Context, q string) ([]models.Product, error) {
	query := `SELECT ` + productColumns + productJoin
	args := make([]any, 0)
	if q = strings.TrimSpace(q); q != "" {
		// Türkçe karakter duyarlı: "cay" → "Çay", "ISI" → "Işı" vb.
		// OR koşulları parantez içindedir; sku NULL olabileceği için COALESCE kullanılır.
		query += ` WHERE (unaccent(lower(p.name)) LIKE unaccent(lower($1)) OR unaccent(lower(COALESCE(p.sku, ''))) LIKE unaccent(lower($1)))`
		args = append(args, "%"+q+"%")
	}
	query += ` ORDER BY p.id`

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("ürünler listelenemedi: %w", err)
	}
	defer rows.Close()

	products := make([]models.Product, 0)
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.PV, &p.CV, &p.Stock, &p.Description, &p.ImagePath, &p.Category, &p.CategoryID, &p.CategoryName, &p.SKU, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("ürün okunamadı: %w", err)
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

// UpdateProduct ürünün tüm değişebilir alanlarını günceller (category_id dahil).
func (s *ProductService) UpdateProduct(ctx context.Context, p *models.Product) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE products SET name = $1, price = $2, pv = $3, cv = $4, stock = $5, description = $6, image_path = $7, category = $8, category_id = $9, sku = $10 WHERE id = $11`,
		p.Name, p.Price, p.PV, p.CV, p.Stock, p.Description, p.ImagePath, p.Category, p.CategoryID, p.SKU, p.ID)
	if err != nil {
		return fmt.Errorf("ürün güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}

// DeleteProduct ürünü siler.
func (s *ProductService) DeleteProduct(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("ürün silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrProductNotFound
	}
	return nil
}

// PopularProduct ürün + son dönemdeki satış adedidir.
type PopularProduct struct {
	models.Product
	SoldQuantity int64 `json:"sold_quantity"`
}

// ListPopular belirtilen gün içinde en çok satın alınan (status=paid) ürünleri
// satış adedine göre azalan sırada döndürür (herkese açık).
func (s *ProductService) ListPopular(ctx context.Context, limit, days int) ([]PopularProduct, error) {
	if limit <= 0 {
		limit = 3
	}
	if days <= 0 {
		days = 7
	}

	rows, err := s.db.Query(ctx, `
		SELECT `+productColumns+`,
		       COALESCE(SUM(oi.quantity), 0) AS sold
		FROM products p
		LEFT JOIN categories c ON c.id = p.category_id
		LEFT JOIN order_items oi
			ON oi.product_id = p.id
		LEFT JOIN orders o
			ON o.id = oi.order_id AND o.status = 'paid' AND o.created_at >= NOW() - ($2::int * INTERVAL '1 day')
		GROUP BY p.id, c.id
		ORDER BY sold DESC, p.id ASC
		LIMIT $1`, limit, days)
	if err != nil {
		return nil, fmt.Errorf("popüler ürünler listelenemedi: %w", err)
	}
	defer rows.Close()

	products := make([]PopularProduct, 0)
	for rows.Next() {
		var p PopularProduct
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.PV, &p.CV, &p.Stock, &p.Description, &p.ImagePath, &p.Category, &p.CategoryID, &p.CategoryName, &p.SKU, &p.CreatedAt, &p.SoldQuantity); err != nil {
			return nil, fmt.Errorf("ürün okunamadı: %w", err)
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
