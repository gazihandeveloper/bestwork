package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// CommissionHandler komisyon geçmişi endpoint'lerini yönetir.
type CommissionHandler struct {
	commissions *services.CommissionService
}

// NewCommissionHandler yeni bir CommissionHandler örneği döndürür.
func NewCommissionHandler(commissions *services.CommissionService) *CommissionHandler {
	return &CommissionHandler{commissions: commissions}
}

// List kullanıcının kendi komisyon geçmişini filtreli ve sayfalı döndürür (JWT korumalı).
// Sorgu parametreleri: ?type=referral|binary|matching&status=paid|pending|cancelled&limit=20&offset=0
func (h *CommissionHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	commissionType := c.Query("type")
	if commissionType != "" && commissionType != "referral" && commissionType != "binary" && commissionType != "matching" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz type filtresi (referral, binary, matching)"})
		return
	}

	status := c.Query("status")
	if status != "" && status != "paid" && status != "pending" && status != "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz status filtresi (paid, pending, cancelled)"})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz limit değeri"})
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz offset değeri"})
		return
	}

	commissions, total, err := h.commissions.ListUserCommissions(c.Request.Context(), userID, commissionType, status, limit, offset)
	if err != nil {
		log.WithError(err).Error("Komisyon geçmişi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Komisyon geçmişi getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"commissions": commissions,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}
