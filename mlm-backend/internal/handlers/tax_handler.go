package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// TaxHandler vergi (KDV) tanımları endpoint'lerini yönetir.
type TaxHandler struct {
	taxes *services.TaxService
}

// NewTaxHandler yeni bir TaxHandler örneği döndürür.
func NewTaxHandler(taxes *services.TaxService) *TaxHandler {
	return &TaxHandler{taxes: taxes}
}

// TaxRequest vergi oluşturma/güncelleme JSON gövdesidir.
type TaxRequest struct {
	Title     string  `json:"title" binding:"required"`
	Rate      float64 `json:"rate" binding:"gte=0"`
	SortOrder int     `json:"sort_order"`
	Status    string  `json:"status"`
}

// List vergi tanımlarını döndürür (admin).
func (h *TaxHandler) List(c *gin.Context) {
	onlyActive := c.Query("active") == "1"
	taxes, err := h.taxes.List(c.Request.Context(), onlyActive)
	if err != nil {
		log.WithError(err).Error("Vergiler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Vergiler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"taxes": taxes})
}

// Create yeni vergi ekler.
func (h *TaxHandler) Create(c *gin.Context) {
	var req TaxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	t, err := h.taxes.Create(c.Request.Context(), req.Title, req.Rate, req.SortOrder, req.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"tax": t})
}

// Update vergiyi günceller.
func (h *TaxHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz vergi ID"})
		return
	}
	var req TaxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	t, err := h.taxes.Update(c.Request.Context(), id, req.Title, req.Rate, req.SortOrder, req.Status)
	if err != nil {
		if errors.Is(err, services.ErrTaxNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vergi bulunamadı"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tax": t})
}

// Delete vergiyi siler.
func (h *TaxHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz vergi ID"})
		return
	}
	if err := h.taxes.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrTaxNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vergi bulunamadı"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vergi silindi"})
}
