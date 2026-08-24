package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// PendingPoolHandler bekleyenler havuzu endpoint'lerini yönetir.
type PendingPoolHandler struct {
	pool *services.PendingPoolService
}

// NewPendingPoolHandler yeni bir PendingPoolHandler örneği döndürür.
func NewPendingPoolHandler(pool *services.PendingPoolService) *PendingPoolHandler {
	return &PendingPoolHandler{pool: pool}
}

// PlaceRequest ağaca yerleştirme isteğinin JSON gövdesidir.
type PlaceRequest struct {
	UserID   int64  `json:"user_id" binding:"required"`
	Position string `json:"position" binding:"required"`
}

// List giriş yapan kullanıcının bekleyenlerini döndürür (JWT korumalı).
func (h *PendingPoolHandler) List(c *gin.Context) {
	sponsorID := c.GetInt64("user_id")

	users, err := h.pool.ListPendingUsersBySponsor(c.Request.Context(), sponsorID)
	if err != nil {
		log.WithError(err).Error("Bekleyenler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bekleyenler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pending_users": users})
}

// Place bekleyen kullanıcıyı ağaca yerleştirir (JWT korumalı).
func (h *PendingPoolHandler) Place(c *gin.Context) {
	sponsorID := c.GetInt64("user_id")

	var req PlaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	err := h.pool.PlaceUser(c.Request.Context(), sponsorID, req.UserID, req.Position)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidPosition),
			errors.Is(err, services.ErrUserAlreadyPlaced),
			errors.Is(err, services.ErrPoolEntryNotFound),
			errors.Is(err, services.ErrPositionOccupied),
			errors.Is(err, services.ErrInvalidPlacement),
			errors.Is(err, services.ErrInactiveUser),
			errors.Is(err, services.ErrPlacementRequiresPurchase):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserNotFound),
			errors.Is(err, services.ErrSponsorNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Kullanıcı ağaca yerleştirilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı ağaca yerleştirilemedi"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı ağaca yerleştirildi"})
}

// PlaceByCodeRequest boş bacağa kodla yerleştirme isteğidir.
type PlaceByCodeRequest struct {
	Code     string `json:"code" binding:"required"`
	ParentID int64  `json:"parent_id" binding:"required"`
	Position string `json:"position" binding:"required"`
}

// PlaceByCode bekleyen üyeyi, kullanıcının ağacındaki belirli boş bacağa üye koduyla yerleştirir.
func (h *PendingPoolHandler) PlaceByCode(c *gin.Context) {
	sponsorID := c.GetInt64("user_id")
	if sponsorID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
		return
	}

	var req PlaceByCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	u, err := h.pool.PlaceUserUnderByCode(c.Request.Context(), sponsorID, req.Code, req.ParentID, req.Position)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Bu üye kodu bulunamadı"})
		case errors.Is(err, services.ErrPoolEntryNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bu üye sizin bekleyen listenizde değil"})
		case errors.Is(err, services.ErrPositionOccupied):
			c.JSON(http.StatusConflict, gin.H{"error": "Seçilen bacak dolu"})
		case errors.Is(err, services.ErrInvalidPlacement):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz yerleştirme hedefi"})
		case errors.Is(err, services.ErrUserAlreadyPlaced):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Üye zaten ağaca yerleştirilmiş"})
		case errors.Is(err, services.ErrPlacementRequiresPurchase):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Kodla yerleştirme başarısız")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Yerleştirme sırasında bir hata oluştu"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": u, "message": "Üye ağaca yerleştirildi"})
}
