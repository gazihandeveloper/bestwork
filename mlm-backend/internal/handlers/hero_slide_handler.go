package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// HeroSlideHandler ana sayfa slider endpoint'lerini yönetir.
type HeroSlideHandler struct {
	slides *services.HeroSlideService
}

// NewHeroSlideHandler yeni bir HeroSlideHandler örneği döndürür.
func NewHeroSlideHandler(slides *services.HeroSlideService) *HeroSlideHandler {
	return &HeroSlideHandler{slides: slides}
}

// HeroSlideRequest slider oluşturma/güncelleme JSON gövdesidir.
type HeroSlideRequest struct {
	Title               string `json:"title" binding:"required"`
	Subtitle            string `json:"subtitle"`
	Description         string `json:"description"`
	ImagePath           string `json:"image_path" binding:"required"`
	Link                string `json:"link"`
	PrimaryButtonText   string `json:"primary_button_text"`
	PrimaryButtonLink   string `json:"primary_button_link"`
	SecondaryButtonText string `json:"secondary_button_text"`
	SecondaryButtonLink string `json:"secondary_button_link"`
	ShowButtons         *bool  `json:"show_buttons"`
	SortOrder           int    `json:"sort_order"`
	IsActive            bool   `json:"is_active"`
}

// toModel istek gövdesini models.HeroSlide'a çevirir.
func (r HeroSlideRequest) toModel() *models.HeroSlide {
	ptr := func(v string) *string {
		v = strings.TrimSpace(v)
		if v == "" {
			return nil
		}
		return &v
	}
	show := true
	if r.ShowButtons != nil {
		show = *r.ShowButtons
	}
	return &models.HeroSlide{
		Title:               strings.TrimSpace(r.Title),
		Subtitle:            ptr(r.Subtitle),
		Description:         ptr(r.Description),
		ImagePath:           strings.TrimSpace(r.ImagePath),
		Link:                ptr(r.Link),
		PrimaryButtonText:   ptr(r.PrimaryButtonText),
		PrimaryButtonLink:   ptr(r.PrimaryButtonLink),
		SecondaryButtonText: ptr(r.SecondaryButtonText),
		SecondaryButtonLink: ptr(r.SecondaryButtonLink),
		ShowButtons:         show,
		SortOrder:           r.SortOrder,
		IsActive:            r.IsActive,
	}
}

// List aktif sliderları sıralı döndürür (herkese açık).
func (h *HeroSlideHandler) List(c *gin.Context) {
	slides, err := h.slides.ListActive(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Sliderlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sliderlar listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"hero_slides": slides})
}

// ListAll tüm slider kayıtlarını döndürür (JWT korumalı).
func (h *HeroSlideHandler) ListAll(c *gin.Context) {
	slides, err := h.slides.ListAll(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Sliderlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sliderlar listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"hero_slides": slides})
}

// Create yeni slider kaydı ekler (JWT korumalı).
func (h *HeroSlideHandler) Create(c *gin.Context) {
	var req HeroSlideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	slide, err := h.slides.CreateSlide(c.Request.Context(), req.toModel())
	if err != nil {
		log.WithError(err).Error("Slider eklenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"hero_slide": slide})
}

// Update slider kaydını günceller (JWT korumalı).
func (h *HeroSlideHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz slider ID"})
		return
	}

	var req HeroSlideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	slide, err := h.slides.GetSlideByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrHeroSlideNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Slider kaydı bulunamadı"})
			return
		}
		log.WithError(err).Error("Slider getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Slider getirilemedi"})
		return
	}

	m := req.toModel()
	slide.Title = m.Title
	slide.Subtitle = m.Subtitle
	slide.Description = m.Description
	slide.ImagePath = m.ImagePath
	slide.Link = m.Link
	slide.PrimaryButtonText = m.PrimaryButtonText
	slide.PrimaryButtonLink = m.PrimaryButtonLink
	slide.SecondaryButtonText = m.SecondaryButtonText
	slide.SecondaryButtonLink = m.SecondaryButtonLink
	slide.ShowButtons = m.ShowButtons
	slide.SortOrder = m.SortOrder
	slide.IsActive = m.IsActive

	if err := h.slides.UpdateSlide(c.Request.Context(), slide); err != nil {
		log.WithError(err).Error("Slider güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"hero_slide": slide})
}

// Delete slider kaydını siler (JWT korumalı).
func (h *HeroSlideHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz slider ID"})
		return
	}

	if err := h.slides.DeleteSlide(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrHeroSlideNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Slider kaydı bulunamadı"})
			return
		}
		log.WithError(err).Error("Slider silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Slider kaydı silindi"})
}
