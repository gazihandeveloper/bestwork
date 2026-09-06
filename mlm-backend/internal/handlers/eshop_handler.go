package handlers

import (
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// EshopHandler, eshop storefront'unun (bestwork2) tükettiği uyumlu JSON
// sözleşmesini BestWork verisinden üretir. Amaç: eshop'u BestWork API'sine
// bağlamak. Mevcut MLM endpoint'lerine dokunmaz — ayrı /eshop/* rotalarıdır.
type EshopHandler struct {
	products   *services.ProductService
	categories *services.CategoryService
}

// NewEshopHandler yeni bir EshopHandler döndürür.
func NewEshopHandler(products *services.ProductService, categories *services.CategoryService) *EshopHandler {
	return &EshopHandler{products: products, categories: categories}
}

// EshopCategory eshop'un beklediği kategori şeklidir.
type EshopCategory struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Icon        string `json:"icon"`
	Description string `json:"description,omitempty"`
	IsActive    bool   `json:"isActive"`
}

// EshopProduct eshop'un beklediği ürün şeklidir.
// Not: eshop fiyatı "cent" (kuruş) cinsinden bekler (2999 = 29.99 TL).
// pv/cv alanları paket (seviye) yükseltme modalında kullanılır.
type EshopProduct struct {
	ID           int64          `json:"id"`
	Name         string         `json:"name"`
	Slug         string         `json:"slug"`
	Description  string         `json:"description"`
	Price        int64          `json:"price"`
	ComparePrice int64          `json:"comparePrice,omitempty"`
	PV           int64          `json:"pv"`
	CV           int64          `json:"cv"`
	Images       []string       `json:"images"`
	Thumbnail    string         `json:"thumbnail"`
	CategoryID   *int64         `json:"categoryId,omitempty"`
	Category     *EshopCategory `json:"category,omitempty"`
	Stock        int            `json:"stock"`
	SKU          string         `json:"sku"`
	Tags         []string       `json:"tags"`
	Rating       float64        `json:"rating"`
	ReviewCount  int            `json:"reviewCount"`
	IsActive     bool           `json:"isActive"`
	IsFeatured   bool           `json:"isFeatured"`
	CreatedAt    string         `json:"createdAt"`
}

// slugify Türkçe karakterleri sadeleştirip kebab-case üretir (kararlıdır).
func slugify(s string) string {
	r := strings.NewReplacer(
		"ş", "s", "ç", "c", "ğ", "g", "ı", "i", "ö", "o", "ü", "u",
		"Ş", "S", "Ç", "C", "Ğ", "G", "İ", "I", "Ö", "O", "Ü", "U",
	)
	s = r.Replace(s)
	s = strings.ToLower(s)
	var b strings.Builder
	lastDash := false
	for _, ch := range s {
		switch {
		case ch >= 'a' && ch <= 'z', ch >= '0' && ch <= '9':
			b.WriteRune(ch)
			lastDash = false
		default:
			if !lastDash {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "urun"
	}
	return out
}

// eshopUploadBase eshop'un next/image optimizasyonu için kullandığı tam URL
// köküdür (uzak görsel olduğundan remotePatterns ile eşleşir).
const eshopUploadBase = "https://mahmutgazihanarslan.com.tr"

// eshopImagePath DB'deki göreli görsel yolunu (örn. "uploads/x.webp") tam URL'e
// çevirir. Eshop next/image ile gösterdiğinden uzak URL + remotePatterns gerekir.
func eshopImagePath(p *string) string {
	if p == nil || *p == "" {
		return ""
	}
	s := *p
	if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") {
		return s
	}
	if !strings.HasPrefix(s, "/") {
		s = "/" + s
	}
	return eshopUploadBase + s
}

func (h *EshopHandler) toCategory(c models.Category) EshopCategory {
	slug := ""
	if c.Slug != nil {
		slug = *c.Slug
	}
	desc := ""
	if c.Description != nil {
		desc = *c.Description
	}
	return EshopCategory{ID: c.ID, Name: c.Name, Slug: slug, Icon: c.Icon, Description: desc, IsActive: c.IsActive}
}

func (h *EshopHandler) toProduct(p models.Product, catMap map[int64]models.Category) EshopProduct {
	thumb := eshopImagePath(p.ImagePath)
	images := []string{}
	if thumb != "" {
		images = []string{thumb}
	}
	desc := ""
	if p.Description != nil {
		desc = *p.Description
	}
	sku := ""
	if p.SKU != nil {
		sku = *p.SKU
	}
	// Fiyatı cent'e çevir (TL → kuruş).
	priceCent := int64(math.Round(p.Price * 100))

	var cat *EshopCategory
	if p.CategoryID != nil {
		if c, ok := catMap[*p.CategoryID]; ok {
			cc := h.toCategory(c)
			cat = &cc
		} else if p.CategoryName != nil && *p.CategoryName != "" {
			cc := EshopCategory{ID: *p.CategoryID, Name: *p.CategoryName, Slug: slugify(*p.CategoryName), IsActive: true}
			cat = &cc
		}
	}

	return EshopProduct{
		ID:          p.ID,
		Name:        p.Name,
		Slug:        slugify(p.Name),
		Description: desc,
		Price:       priceCent,
		PV:          p.PV,
		CV:          p.CV,
		Images:      images,
		Thumbnail:   thumb,
		CategoryID:  p.CategoryID,
		Category:    cat,
		Stock:       p.Stock,
		SKU:         sku,
		Tags:        []string{},
		Rating:      0,
		ReviewCount: 0,
		IsActive:    true,
		IsFeatured:  false,
		CreatedAt:   p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ok eshop zarfıyla yanıt döner: {success:true, data:...}.
func ok(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

// ListProducts eshop'un /products çağrısına karşılık verir.
// Query: page, limit (varsayılan limit 50), q (arama).
func (h *EshopHandler) ListProducts(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	products, err := h.products.ListProducts(c.Request.Context(), q)
	if err != nil {
		log.WithError(err).Error("Eshop ürün listesi alınamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Ürünler listelenemedi"})
		return
	}

	cats, err := h.categories.List(c.Request.Context(), false)
	if err != nil {
		cats = nil
	}
	catMap := make(map[int64]models.Category, len(cats))
	for _, cc := range cats {
		catMap[cc.ID] = cc
	}

	items := make([]EshopProduct, 0, len(products))
	for _, p := range products {
		items = append(items, h.toProduct(p, catMap))
	}

	page := 1
	limit := 50
	if v := c.Query("page"); v != "" {
		if n := atoiSafe(v); n > 0 {
			page = n
		}
	}
	if v := c.Query("limit"); v != "" {
		if n := atoiSafe(v); n > 0 {
			limit = n
		}
	}

	total := len(items)
	totalPages := 1
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}
	if totalPages < 1 {
		totalPages = 1
	}
	start := (page - 1) * limit
	end := start + limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	ok(c, gin.H{
		"items": items[start:end],
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

// GetProductBySlug eshop'un /products/slug/:slug çağrısına karşılık verir.
func (h *EshopHandler) GetProductBySlug(c *gin.Context) {
	slug := slugify(c.Param("slug"))
	products, err := h.products.ListProducts(c.Request.Context(), "")
	if err != nil {
		log.WithError(err).Error("Eshop ürün detayı alınamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Ürün bulunamadı"})
		return
	}

	cats, err := h.categories.List(c.Request.Context(), false)
	if err != nil {
		cats = nil
	}
	catMap := make(map[int64]models.Category, len(cats))
	for _, cc := range cats {
		catMap[cc.ID] = cc
	}

	for _, p := range products {
		if slugify(p.Name) == slug {
			ok(c, h.toProduct(p, catMap))
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Ürün bulunamadı"})
}

// ListCategories eshop'un /categories çağrısına karşılık verir (dizi döner).
func (h *EshopHandler) ListCategories(c *gin.Context) {
	cats, err := h.categories.List(c.Request.Context(), false)
	if err != nil {
		log.WithError(err).Error("Eshop kategori listesi alınamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Kategoriler listelenemedi"})
		return
	}
	out := make([]EshopCategory, 0, len(cats))
	for _, cc := range cats {
		out = append(out, h.toCategory(cc))
	}
	ok(c, out)
}

func atoiSafe(s string) int {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + int(ch-'0')
		if n > 1_000_000 {
			return 0
		}
	}
	return n
}
