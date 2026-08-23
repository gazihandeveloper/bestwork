package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// RetailHandler perakende kazanç endpoint'lerini yönetir.
type RetailHandler struct {
	retail *services.RetailService
}

// NewRetailHandler yeni bir RetailHandler örneği döndürür.
func NewRetailHandler(retail *services.RetailService) *RetailHandler {
	return &RetailHandler{retail: retail}
}

// Earnings kullanıcının perakende kazanç özetini ve detay listesini döndürür (JWT korumalı).
// Sorgu parametreleri: ?month=YYYY-MM&limit=20&offset=0
func (h *RetailHandler) Earnings(c *gin.Context) {
	userID := c.GetInt64("user_id")

	month := c.Query("month")
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

	result, err := h.retail.GetRetailEarnings(c.Request.Context(), userID, month, limit, offset)
	if err != nil {
		log.WithError(err).Error("Perakende kazançlar getirilemedi")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
