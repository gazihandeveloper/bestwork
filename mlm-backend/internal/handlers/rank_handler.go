package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
	"mlm-backend/internal/services"
)

// RankHandler rütbe bilgisi endpoint'lerini yönetir.
type RankHandler struct{}

// NewRankHandler yeni bir RankHandler örneği döndürür.
func NewRankHandler() *RankHandler {
	return &RankHandler{}
}

// List tüm rütbeleri (kariyer seviyeleri) döndürür (herkese açık).
func (h *RankHandler) List(c *gin.Context) {
	ranks, err := services.GetAllRanks(c.Request.Context(), database.GetDB())
	if err != nil {
		log.WithError(err).Error("Rütbeler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Rütbeler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ranks": ranks})
}
