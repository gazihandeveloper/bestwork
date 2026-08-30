package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// AnnouncementHandler duyuru endpoint'lerini yönetir.
type AnnouncementHandler struct {
	announcements *services.AnnouncementService
}

func NewAnnouncementHandler(a *services.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{announcements: a}
}

// AnnouncementRequest duyuru oluşturma/güncelleme gövdesidir.
type AnnouncementRequest struct {
	Title    string `json:"title" binding:"required"`
	Body     string `json:"body" binding:"required"`
	Audience string `json:"audience"`
	IsActive *bool  `json:"is_active"`
}

// ListActive aktif duyuruları döndürür (herkese açık).
func (h *AnnouncementHandler) ListActive(c *gin.Context) {
	items, err := h.announcements.ListActive(c.Request.Context(), c.Query("audience"))
	if err != nil {
		log.WithError(err).Error("Duyurular listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Duyurular listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"announcements": items})
}

// ListAll tüm duyuruları döndürür (admin).
func (h *AnnouncementHandler) ListAll(c *gin.Context) {
	items, err := h.announcements.ListAll(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Duyurular listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Duyurular listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"announcements": items})
}

// Create yeni duyuru ekler (admin).
func (h *AnnouncementHandler) Create(c *gin.Context) {
	var req AnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	a, err := h.announcements.Create(c.Request.Context(), req.Title, req.Body, req.Audience, isActive)
	if err != nil {
		log.WithError(err).Error("Duyuru eklenemedi")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"announcement": a})
}

// Update duyuruyu günceller (admin).
func (h *AnnouncementHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz duyuru ID"})
		return
	}
	var req AnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	a := &models.Announcement{ID: id, Title: req.Title, Body: req.Body, Audience: req.Audience, IsActive: isActive}
	if err := h.announcements.Update(c.Request.Context(), a); err != nil {
		if errors.Is(err, services.ErrAnnouncementNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Duyuru güncellenemedi")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"announcement": a})
}

// Delete duyuruyu siler (admin).
func (h *AnnouncementHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz duyuru ID"})
		return
	}
	if err := h.announcements.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrAnnouncementNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Duyuru silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Duyuru silindi"})
}
