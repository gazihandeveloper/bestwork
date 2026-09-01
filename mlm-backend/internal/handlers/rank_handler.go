package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
	"mlm-backend/internal/models"
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

// RankRequest seviye oluşturma/güncelleme JSON gövdesidir.
type RankRequest struct {
	Name                   string  `json:"name" binding:"required"`
	RequiredLeftPV         int64   `json:"required_left_pv" binding:"gte=0"`
	RequiredRightPV        int64   `json:"required_right_pv" binding:"gte=0"`
	MonthlyBinaryLimit     float64 `json:"monthly_binary_limit" binding:"gte=0"`
	RequiredDownlineRankID *int    `json:"required_downline_rank_id"`
	RequiredDownlineCount  int     `json:"required_downline_count" binding:"gte=0"`
	PersonalActivityPV     int64   `json:"personal_activity_pv" binding:"gte=0"`
}

// toRank RankRequest'i models.Rank'e dönüştürür.
func (req RankRequest) toRank() *models.Rank {
	return &models.Rank{
		Name:                   req.Name,
		RequiredLeftPV:         req.RequiredLeftPV,
		RequiredRightPV:        req.RequiredRightPV,
		MonthlyBinaryLimit:     req.MonthlyBinaryLimit,
		RequiredDownlineRankID: req.RequiredDownlineRankID,
		RequiredDownlineCount:  req.RequiredDownlineCount,
		PersonalActivityPV:     req.PersonalActivityPV,
	}
}

// ListAll tüm seviyeleri döndürür (admin).
func (h *RankHandler) ListAll(c *gin.Context) {
	ranks, err := services.GetAllRanks(c.Request.Context(), database.GetDB())
	if err != nil {
		log.WithError(err).Error("Seviyeler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Seviyeler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ranks": ranks})
}

// Create yeni seviye ekler (admin).
func (h *RankHandler) Create(c *gin.Context) {
	var req RankRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	r, err := services.CreateRank(c.Request.Context(), database.GetDB(), req.toRank())
	if err != nil {
		log.WithError(err).Error("Seviye eklenemedi")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"rank": r})
}

// Update seviyeyi günceller (admin).
func (h *RankHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz seviye ID"})
		return
	}
	var req RankRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	r := req.toRank()
	r.ID = id
	if err := services.UpdateRank(c.Request.Context(), database.GetDB(), r); err != nil {
		switch {
		case errors.Is(err, services.ErrRankNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Seviye güncellenemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"rank": r})
}

// Delete seviyeyi siler (admin).
func (h *RankHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz seviye ID"})
		return
	}
	if err := services.DeleteRank(c.Request.Context(), database.GetDB(), id); err != nil {
		switch {
		case errors.Is(err, services.ErrRankNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Seviye silinemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Seviye silindi"})
}
