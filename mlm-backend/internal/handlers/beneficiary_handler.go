package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// BeneficiaryHandler varis bilgisi endpoint'lerini yönetir.
type BeneficiaryHandler struct {
	beneficiaries *services.BeneficiaryService
}

// NewBeneficiaryHandler yeni bir BeneficiaryHandler örneği döndürür.
func NewBeneficiaryHandler(beneficiaries *services.BeneficiaryService) *BeneficiaryHandler {
	return &BeneficiaryHandler{beneficiaries: beneficiaries}
}

// BeneficiaryPayload varis JSON gövdesidir.
type BeneficiaryPayload struct {
	FullName     string `json:"full_name" binding:"required"`
	Relationship string `json:"relationship" binding:"required"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
}

// List kullanıcının varislerini döndürür (JWT korumalı).
func (h *BeneficiaryHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	items, err := h.beneficiaries.ListBeneficiariesByUser(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Varisler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Varisler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"beneficiaries": items})
}

// Create yeni varis ekler (JWT korumalı).
func (h *BeneficiaryHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req BeneficiaryPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	b, err := h.beneficiaries.CreateBeneficiary(c.Request.Context(), userID, req.FullName, req.Relationship, req.Phone, req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"beneficiary": b})
}

// Delete varisi siler (JWT korumalı, yalnızca sahibi).
func (h *BeneficiaryHandler) Delete(c *gin.Context) {
	userID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz varis ID"})
		return
	}

	existing, err := h.beneficiaries.GetBeneficiaryByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrBeneficiaryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Varis getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Varis getirilemedi"})
		return
	}
	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu kayda erişim izniniz yok"})
		return
	}

	if err := h.beneficiaries.DeleteBeneficiary(c.Request.Context(), id); err != nil {
		log.WithError(err).Error("Varis silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Varis silindi"})
}
