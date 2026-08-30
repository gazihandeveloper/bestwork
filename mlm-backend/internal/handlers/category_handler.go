package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// CategoryHandler kategori endpoint'lerini yönetir.
type CategoryHandler struct {
	categories *services.CategoryService
}

// NewCategoryHandler yeni bir CategoryHandler örneği döndürür.
func NewCategoryHandler(categories *services.CategoryService) *CategoryHandler {
	return &CategoryHandler{categories: categories}
}

// CategoryRequest kategori oluşturma/güncelleme JSON gövdesidir.
type CategoryRequest struct {
	Name        string  `json:"name" binding:"required"`
	Slug        string  `json:"slug"`
	Icon        string  `json:"icon"`
	Description *string `json:"description"`
	SortOrder   int     `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

// List kategorileri döndürür (herkese açık). Varsayılan olarak yalnızca
// aktif kategoriler gelir; ?all=1 ise tümü döner.
func (h *CategoryHandler) List(c *gin.Context) {
	all := c.Query("all") == "1"
	categories, err := h.categories.List(c.Request.Context(), all)
	if err != nil {
		log.WithError(err).Error("Kategoriler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kategoriler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// Create yeni kategori ekler (JWT korumalı).
func (h *CategoryHandler) Create(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	var description string
	if req.Description != nil {
		description = *req.Description
	}

	cat, err := h.categories.Create(c.Request.Context(), req.Name, req.Slug, req.Icon, description, req.SortOrder, isActive)
	if err != nil {
		log.WithError(err).Error("Kategori eklenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"category": cat})
}

// Update kategoriyi günceller (JWT korumalı).
func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kategori ID"})
		return
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	cat, err := h.categories.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrCategoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kategori bulunamadı"})
			return
		}
		log.WithError(err).Error("Kategori getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kategori getirilemedi"})
		return
	}

	cat.Name = req.Name
	if req.Slug != "" {
		cat.Slug = &req.Slug
	}
	if req.Icon != "" {
		cat.Icon = req.Icon
	}
	if req.Description != nil {
		cat.Description = req.Description
	}
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}
	cat.SortOrder = req.SortOrder

	if err := h.categories.Update(c.Request.Context(), cat); err != nil {
		if errors.Is(err, services.ErrCategoryDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Kategori güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"category": cat})
}

// Delete kategoriyi siler (JWT korumalı).
func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kategori ID"})
		return
	}

	if err := h.categories.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrCategoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kategori bulunamadı"})
			return
		}
		log.WithError(err).Error("Kategori silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kategori silindi"})
}
