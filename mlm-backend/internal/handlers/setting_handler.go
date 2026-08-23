package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// SettingHandler site ayarı endpoint'lerini yönetir.
type SettingHandler struct {
	settings *services.SettingService
}

// NewSettingHandler yeni bir SettingHandler örneği döndürür.
func NewSettingHandler(settings *services.SettingService) *SettingHandler {
	return &SettingHandler{settings: settings}
}

// SettingUpdateRequest ayar güncelleme JSON gövdesidir.
type SettingUpdateRequest struct {
	Settings map[string]string `json:"settings" binding:"required"`
}

// Get tüm site ayarlarını döndürür (herkese açık).
func (h *SettingHandler) Get(c *gin.Context) {
	settings, err := h.settings.GetAll(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Ayarlar okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ayarlar okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

// Update site ayarlarını günceller (JWT korumalı).
func (h *SettingHandler) Update(c *gin.Context) {
	var req SettingUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	if err := h.settings.SetAll(c.Request.Context(), req.Settings); err != nil {
		log.WithError(err).Error("Ayarlar güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Ayarlar güncellendi"})
}
