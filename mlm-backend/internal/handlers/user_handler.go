package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// UserHandler kullanıcı endpoint'lerini yönetir.
type UserHandler struct {
	users *services.UserService
}

// NewUserHandler yeni bir UserHandler örneği döndürür.
func NewUserHandler(users *services.UserService) *UserHandler {
	return &UserHandler{users: users}
}

// Me JWT'den alınan user_id ile kullanıcının bilgilerini döndürür.
func (h *UserHandler) Me(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
		return
	}

	user, err := h.users.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// LookupByCode üye kodundan kullanıcının temel bilgilerini döndürür (ağaçta arama/navigasyon için).
func (h *UserHandler) LookupByCode(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Query("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Üye kodu zorunludur"})
		return
	}

	user, err := h.users.GetUserByMemberCode(c.Request.Context(), code)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Üye bulunamadı"})
			return
		}
		log.WithError(err).Error("Üye araması başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Üye araması yapılamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": map[string]any{
		"id":          user.ID,
		"name":        user.Name,
		"member_code": user.MemberCode,
	}})
}

// Sponsored kullanıcının sponsor olduğu üyeleri döndürür (JWT korumalı).
func (h *UserHandler) Sponsored(c *gin.Context) {
	userID := c.GetInt64("user_id")

	users, err := h.users.ListSponsoredUsers(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Sponsor olunanlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sponsor olunanlar listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// Career kullanıcının rütbe ilerleme geçmişini döndürür (JWT korumalı).
func (h *UserHandler) Career(c *gin.Context) {
	userID := c.GetInt64("user_id")

	items, err := h.users.GetCareerProgress(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Kariyer geçmişi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyer geçmişi getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"career": items})
}

// Profile kullanıcının profil alanını döndürür (JWT korumalı).
func (h *UserHandler) Profile(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
		return
	}
	profile, err := h.users.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Profil okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// ProfileImageRequest profil görseli güncelleme gövdesidir.
type ProfileImageRequest struct {
	ImagePath string `json:"image_path" binding:"required"`
}

// UpdateProfileImage kullanıcının profil görselini günceller (JWT korumalı).
func (h *UserHandler) UpdateProfileImage(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
		return
	}
	var req ProfileImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}
	if err := h.users.SetProfileImage(c.Request.Context(), userID, req.ImagePath); err != nil {
		log.WithError(err).Error("Profil görseli güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Profil görseli güncellendi"})
}

// ThemeColorRequest tema rengi güncelleme gövdesidir.
type ThemeColorRequest struct {
	Color string `json:"color" binding:"required"`
}

// UpdateTheme kullanıcının tema rengini kaydeder (JWT korumalı).
func (h *UserHandler) UpdateTheme(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
		return
	}
	var req ThemeColorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}
	if err := h.users.SetThemeColor(c.Request.Context(), userID, req.Color); err != nil {
		log.WithError(err).Error("Tema rengi kaydedilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tema rengi kaydedildi"})
}
