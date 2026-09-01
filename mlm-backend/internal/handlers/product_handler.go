package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// ProductHandler ürün endpoint'lerini yönetir.
type ProductHandler struct {
	products *services.ProductService
}

// NewProductHandler yeni bir ProductHandler örneği döndürür.
func NewProductHandler(products *services.ProductService) *ProductHandler {
	return &ProductHandler{products: products}
}

// ProductRequest ürün oluşturma/güncelleme JSON gövdesidir.
type ProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	PV          int64   `json:"pv" binding:"min=0"`
	CV          int64   `json:"cv" binding:"min=0"`
	Stock       int     `json:"stock" binding:"min=0"`
	ImagePath   string  `json:"image_path"`
	Category    string  `json:"category"`
	CategoryID  *int64  `json:"category_id"`
	SKU         string  `json:"sku"`
}

// Create yeni ürün ekler (JWT korumalı).
func (h *ProductHandler) Create(c *gin.Context) {
	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	p, err := h.products.CreateProduct(c.Request.Context(), req.Name, req.Description, req.ImagePath, req.Category, req.SKU, req.Price, req.PV, req.CV, req.Stock, req.CategoryID)
	if err != nil {
		log.WithError(err).Error("Ürün oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"product": p})
}

// List tüm ürünleri döndürür (herkese açık). Query: q (ad/stok kodu araması).
func (h *ProductHandler) List(c *gin.Context) {
	products, err := h.products.ListProducts(c.Request.Context(), c.Query("q"))
	if err != nil {
		log.WithError(err).Error("Ürünler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ürünler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"products": products})
}

// ListPopular son N günde en çok satın alınan ürünleri döndürür (herkese açık).
// Query: limit (varsayılan 3), days (varsayılan 7).
func (h *ProductHandler) ListPopular(c *gin.Context) {
	limit := 3
	days := 7
	if v, err := strconv.Atoi(c.DefaultQuery("limit", "3")); err == nil && v > 0 {
		limit = v
	}
	if v, err := strconv.Atoi(c.DefaultQuery("days", "7")); err == nil && v > 0 {
		days = v
	}

	products, err := h.products.ListPopular(c.Request.Context(), limit, days)
	if err != nil {
		log.WithError(err).Error("Popüler ürünler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Popüler ürünler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"products": products})
}

// Get tek bir ürünü döndürür (herkese açık).
func (h *ProductHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ürün ID"})
		return
	}

	p, err := h.products.GetProductByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ürün bulunamadı"})
			return
		}
		log.WithError(err).Error("Ürün getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ürün getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"product": p})
}

// Update ürünü günceller (JWT korumalı).
func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ürün ID"})
		return
	}

	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	p, err := h.products.GetProductByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ürün bulunamadı"})
			return
		}
		log.WithError(err).Error("Ürün getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ürün getirilemedi"})
		return
	}

	p.Name = req.Name
	p.Price = req.Price
	p.PV = req.PV
	p.CV = req.CV
	p.Stock = req.Stock
	p.CategoryID = req.CategoryID
	desc := req.Description
	p.Description = &desc
	if req.ImagePath != "" {
		img := req.ImagePath
		p.ImagePath = &img
	}
	if req.Category != "" {
		cat := req.Category
		p.Category = &cat
	}
	if req.SKU != "" {
		sku := req.SKU
		p.SKU = &sku
	}

	if err := h.products.UpdateProduct(c.Request.Context(), p); err != nil {
		log.WithError(err).Error("Ürün güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	// Güncel kategori adı dahil tam kaydı yeniden oku ve döndür.
	updated, err := h.products.GetProductByID(c.Request.Context(), id)
	if err != nil {
		log.WithError(err).Error("Güncellenen ürün okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ürün güncellendi ancak okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"product": updated})
}

// Delete ürünü siler (JWT korumalı).
func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ürün ID"})
		return
	}

	if err := h.products.DeleteProduct(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ürün bulunamadı"})
			return
		}
		log.WithError(err).Error("Ürün silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ürün silindi"})
}
