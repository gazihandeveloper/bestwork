package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// BenefitHandler anasayfa avantaj kartı endpoint'lerini yönetir.
type BenefitHandler struct {
	benefits *services.BenefitService
}

// NewBenefitHandler yeni bir BenefitHandler örneği döndürür.
func NewBenefitHandler(benefits *services.BenefitService) *BenefitHandler {
	return &BenefitHandler{benefits: benefits}
}

// BenefitRequest avantaj kartı oluşturma/güncelleme JSON gövdesidir.
type BenefitRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
	Icon        string `json:"icon"`
	SortOrder   int    `json:"sort_order"`
	IsActive    bool   `json:"is_active"`
}

// List aktif avantaj kartlarını sıralı döndürür (herkese açık).
func (h *BenefitHandler) List(c *gin.Context) {
	benefits, err := h.benefits.ListActive(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Avantaj kartları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Avantaj kartları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"benefits": benefits})
}

// ListAll tüm avantaj kartlarını döndürür (JWT korumalı).
func (h *BenefitHandler) ListAll(c *gin.Context) {
	benefits, err := h.benefits.ListAll(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Avantaj kartları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Avantaj kartları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"benefits": benefits})
}

// Create yeni avantaj kartı ekler (JWT korumalı).
func (h *BenefitHandler) Create(c *gin.Context) {
	var req BenefitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	b, err := h.benefits.CreateBenefit(c.Request.Context(), req.Title, req.Description, req.Icon, req.SortOrder, req.IsActive)
	if err != nil {
		log.WithError(err).Error("Avantaj kartı eklenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"benefit": b})
}

// Update avantaj kartını günceller (JWT korumalı).
func (h *BenefitHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz avantaj kartı ID"})
		return
	}

	var req BenefitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	b, err := h.benefits.GetBenefitByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrBenefitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Avantaj kartı bulunamadı"})
			return
		}
		log.WithError(err).Error("Avantaj kartı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Avantaj kartı getirilemedi"})
		return
	}

	b.Title = req.Title
	b.Description = req.Description
	b.Icon = req.Icon
	b.SortOrder = req.SortOrder
	b.IsActive = req.IsActive

	if err := h.benefits.UpdateBenefit(c.Request.Context(), b); err != nil {
		log.WithError(err).Error("Avantaj kartı güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"benefit": b})
}

// Delete avantaj kartını siler (JWT korumalı).
func (h *BenefitHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz avantaj kartı ID"})
		return
	}

	if err := h.benefits.DeleteBenefit(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrBenefitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Avantaj kartı bulunamadı"})
			return
		}
		log.WithError(err).Error("Avantaj kartı silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Avantaj kartı silindi"})
}
