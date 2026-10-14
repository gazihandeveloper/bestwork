package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
	"mlm-backend/internal/models"
	"mlm-backend/internal/money"
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
	PV           float64        `json:"pv"`
	CV           float64        `json:"cv"`
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

// EshopReview eshop'un beklediği ürün yorumu şeklidir.
type EshopReview struct {
	ID        int64  `json:"id"`
	Author    string `json:"author"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
	CreatedAt string `json:"created_at"`
}

// reviewStat ürün başına onaylı yorum özetidir.
type reviewStat struct {
	Count int
	Avg   float64
}

// reviewStats onaylı yorumlardan ürün bazlı sayı/ortalama haritası üretir.
func (h *EshopHandler) reviewStats(ctx context.Context) map[int64]reviewStat {
	out := map[int64]reviewStat{}
	rows, err := database.GetDB().Query(ctx, `
		SELECT product_id, COUNT(*), COALESCE(AVG(rating), 0)
		FROM product_reviews
		WHERE is_approved = TRUE
		GROUP BY product_id`)
	if err != nil {
		log.WithError(err).Warn("Ürün yorum istatistikleri okunamadı")
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var pid int64
		var st reviewStat
		if err := rows.Scan(&pid, &st.Count, &st.Avg); err != nil {
			continue
		}
		out[pid] = st
	}
	return out
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

func (h *EshopHandler) toProduct(p models.Product, catMap map[int64]models.Category, stats map[int64]reviewStat) EshopProduct {
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
	priceCent := money.CentsFromTL(p.Price)

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

	rating := 0.0
	reviewCount := 0
	if st, ok := stats[p.ID]; ok {
		rating = st.Avg
		reviewCount = st.Count
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
		Rating:      rating,
		ReviewCount: reviewCount,
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

	stats := h.reviewStats(c.Request.Context())

	items := make([]EshopProduct, 0, len(products))
	for _, p := range products {
		items = append(items, h.toProduct(p, catMap, stats))
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

	stats := h.reviewStats(c.Request.Context())

	for _, p := range products {
		if slugify(p.Name) == slug {
			ok(c, h.toProduct(p, catMap, stats))
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

// ListReviews GET /eshop/product-reviews/:id — ürünün onaylı yorumları.
func (h *EshopHandler) ListReviews(c *gin.Context) {
	productID := int64(atoiSafe(c.Param("id")))
	if productID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz ürün"})
		return
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT id, author, rating, comment, created_at
		FROM product_reviews
		WHERE product_id = $1 AND is_approved = TRUE
		ORDER BY created_at DESC
		LIMIT 100`, productID)
	if err != nil {
		log.WithError(err).Error("Ürün yorumları okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Yorumlar alınamadı"})
		return
	}
	defer rows.Close()

	items := make([]EshopReview, 0)
	sum := 0
	for rows.Next() {
		var r EshopReview
		var created time.Time
		if err := rows.Scan(&r.ID, &r.Author, &r.Rating, &r.Comment, &created); err != nil {
			continue
		}
		r.CreatedAt = created.Format("2006-01-02T15:04:05Z07:00")
		sum += r.Rating
		items = append(items, r)
	}

	toplam := len(items)
	ortalama := 0.0
	if toplam > 0 {
		ortalama = float64(sum) / float64(toplam)
	}

	ok(c, gin.H{"items": items, "total": toplam, "average": ortalama})
}

// CreateReview POST /eshop/product-reviews/:id — giriş yapan üye yorum yapar.
func (h *EshopHandler) CreateReview(c *gin.Context) {
	userID := c.GetInt64("user_id")
	productID := int64(atoiSafe(c.Param("id")))
	if productID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz ürün"})
		return
	}

	var body struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz istek"})
		return
	}
	body.Comment = strings.TrimSpace(body.Comment)
	if body.Rating < 1 || body.Rating > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Puan 1-5 arasında olmalı"})
		return
	}
	if len([]rune(body.Comment)) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Yorum en az 3 karakter olmalı"})
		return
	}
	runes := []rune(body.Comment)
	if len(runes) > 2000 {
		body.Comment = string(runes[:2000])
	}

	var exists bool
	if err := database.GetDB().QueryRow(c.Request.Context(),
		`SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)`, productID).Scan(&exists); err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Ürün bulunamadı"})
		return
	}

	author := "Üye"
	var name string
	if err := database.GetDB().QueryRow(c.Request.Context(),
		`SELECT COALESCE(name, '') FROM users WHERE id = $1`, userID).Scan(&name); err == nil && strings.TrimSpace(name) != "" {
		author = name
	}

	var id int64
	var created time.Time
	err := database.GetDB().QueryRow(c.Request.Context(), `
		INSERT INTO product_reviews (product_id, user_id, author, rating, comment, is_approved)
		VALUES ($1, $2, $3, $4, $5, FALSE)
		RETURNING id, created_at`, productID, userID, author, body.Rating, body.Comment).Scan(&id, &created)
	if err != nil {
		log.WithError(err).Error("Yorum kaydedilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Yorum kaydedilemedi"})
		return
	}

	ok(c, EshopReview{
		ID:        id,
		Author:    author,
		Rating:    body.Rating,
		Comment:   body.Comment,
		CreatedAt: created.Format("2006-01-02T15:04:05Z07:00"),
	})
}

// AdminReview admin panelin gördüğü yorum şeklidir.
type AdminReview struct {
	ID          int64  `json:"id"`
	ProductID   int64  `json:"product_id"`
	ProductName string `json:"product_name"`
	Author      string `json:"author"`
	Rating      int    `json:"rating"`
	Comment     string `json:"comment"`
	IsApproved  bool   `json:"is_approved"`
	CreatedAt   string `json:"created_at"`
}

// ListAdminReviews GET /admin/product-reviews?status=pending|approved|all
func (h *EshopHandler) ListAdminReviews(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")
	where := ""
	switch status {
	case "pending":
		where = "WHERE pr.is_approved = FALSE"
	case "approved":
		where = "WHERE pr.is_approved = TRUE"
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT pr.id, pr.product_id, COALESCE(p.name, ''), pr.author, pr.rating, pr.comment, pr.is_approved, pr.created_at
		FROM product_reviews pr
		LEFT JOIN products p ON p.id = pr.product_id
		`+where+`
		ORDER BY pr.is_approved ASC, pr.created_at DESC
		LIMIT 200`)
	if err != nil {
		log.WithError(err).Error("Admin yorum listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Yorumlar alınamadı"})
		return
	}
	defer rows.Close()

	items := make([]AdminReview, 0)
	for rows.Next() {
		var r AdminReview
		var created time.Time
		if err := rows.Scan(&r.ID, &r.ProductID, &r.ProductName, &r.Author, &r.Rating, &r.Comment, &r.IsApproved, &created); err != nil {
			continue
		}
		r.CreatedAt = created.Format("2006-01-02T15:04:05Z07:00")
		items = append(items, r)
	}

	var pending, approved int
	_ = database.GetDB().QueryRow(c.Request.Context(), `
		SELECT COUNT(*) FILTER (WHERE is_approved = FALSE), COUNT(*) FILTER (WHERE is_approved = TRUE)
		FROM product_reviews`).Scan(&pending, &approved)

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"counts": gin.H{"pending": pending, "approved": approved, "total": pending + approved},
	})
}

// ApproveReview PATCH /admin/product-reviews/:id/approve — yorumu yayınlar.
func (h *EshopHandler) ApproveReview(c *gin.Context) {
	h.setReviewApproval(c, true)
}

// UnapproveReview PATCH /admin/product-reviews/:id/unapprove — yayından kaldırır.
func (h *EshopHandler) UnapproveReview(c *gin.Context) {
	h.setReviewApproval(c, false)
}

// setReviewApproval yorumun onay durumunu günceller.
func (h *EshopHandler) setReviewApproval(c *gin.Context, approved bool) {
	id := int64(atoiSafe(c.Param("id")))
	if id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz yorum"})
		return
	}
	tag, err := database.GetDB().Exec(c.Request.Context(),
		`UPDATE product_reviews SET is_approved = $2 WHERE id = $1`, id, approved)
	if err != nil || tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Yorum bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "is_approved": approved})
}

// DeleteReview DELETE /admin/product-reviews/:id — yorumu siler.
func (h *EshopHandler) DeleteReview(c *gin.Context) {
	id := int64(atoiSafe(c.Param("id")))
	if id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz yorum"})
		return
	}
	tag, err := database.GetDB().Exec(c.Request.Context(),
		`DELETE FROM product_reviews WHERE id = $1`, id)
	if err != nil || tag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Yorum bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
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
