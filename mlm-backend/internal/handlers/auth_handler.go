package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// AuthHandler kayıt ve giriş endpoint'lerini yönetir.
type AuthHandler struct {
	users        *services.UserService
	cookieSecure bool
}

// NewAuthHandler yeni bir AuthHandler örneği döndürür.
func NewAuthHandler(users *services.UserService, cookieSecure bool) *AuthHandler {
	return &AuthHandler{users: users, cookieSecure: cookieSecure}
}

const authCookieName = "mlm_session"

// ReferralCheckRequest referans kodu kontrol sorgusudur.
type ReferralCheckRequest struct {
	Code string `json:"code" binding:"required"`
}

// CheckReferral verilen referans kodu (üye kodu) sistemde varsa sahibini döndürür
// (herkese açık — kayıt öncesi doğrulama).
func (h *AuthHandler) CheckReferral(c *gin.Context) {
	code := strings.ToUpper(strings.TrimSpace(c.Query("code")))
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"found": false, "error": "Referans kodu zorunludur"})
		return
	}

	user, err := h.users.GetUserByMemberCode(c.Request.Context(), code)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"found": false, "error": "Referans kodu bulunamadı"})
			return
		}
		log.WithError(err).Error("Referans kontrolü başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"found": false, "error": "Referans kontrolü yapılamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"found": true, "name": user.Name, "member_code": user.MemberCode})
}

// RegisterRequest kayıt isteğinin JSON gövdesidir.
type RegisterRequest struct {
	Name              string `json:"name" binding:"required"`
	Email             string `json:"email" binding:"required,email"`
	Phone             string `json:"phone"`
	Password          string `json:"password" binding:"required,min=8,max=72"`
	SponsorIdentifier string         `json:"sponsor_identifier"`
	Role              string         `json:"role"`
	Profile           map[string]any `json:"profile"`
}

// Register yeni kullanıcı oluşturur ve JWT döndürür.
// role: 'user' (girişimci, varsayılan) veya 'customer' (müşteri, sponsor zorunlu).
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role == "" {
		role = "user"
	}
	if role != "user" && role != "customer" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz rol: 'user' veya 'customer' olmalıdır"})
		return
	}

	// Sponsor opsiyonel (üye için); TR90 ile başlıyorsa üye kodu, değilse e-posta ile aranır.
	var sponsorID *int64
	if req.SponsorIdentifier != "" {
		identifier := strings.TrimSpace(req.SponsorIdentifier)

		var (
			sponsor *models.User
			err     error
		)
		if strings.HasPrefix(strings.ToUpper(identifier), "TR90") {
			sponsor, err = h.users.GetUserByMemberCode(c.Request.Context(), identifier)
		} else {
			sponsor, err = h.users.GetUserByEmail(c.Request.Context(), identifier)
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sponsor bulunamadı"})
			return
		}
		sponsorID = &sponsor.ID
	}

	// Müşteri kaydı için sponsor zorunlu
	if role == "customer" && sponsorID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Müşteri kaydı için sponsor zorunludur"})
		return
	}

	user, err := h.users.CreateUser(c.Request.Context(), req.Name, req.Email, req.Password, req.Phone, sponsorID, role, req.Profile)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmailExists), errors.Is(err, services.ErrPhoneExists):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrSponsorNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sponsor bulunamadı"})
		default:
			log.WithError(err).Error("Kayıt işlemi başarısız")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kayıt sırasında bir hata oluştu"})
		}
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		log.WithError(err).Error("Token üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token üretilemedi"})
		return
	}

	h.setSessionCookie(c, token)
	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// LoginRequest giriş isteğinin JSON gövdesidir.
type LoginRequest struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login e-posta veya üye kodu ile giriş yapar ve JWT döndürür.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	login := strings.TrimSpace(req.Login)

	var (
		user *models.User
		err  error
	)
	if strings.HasPrefix(strings.ToUpper(login), "TR90") {
		user, err = h.users.GetUserByMemberCode(c.Request.Context(), login)
	} else {
		user, err = h.users.GetUserByEmail(c.Request.Context(), login)
		if errors.Is(err, services.ErrUserNotFound) {
			user, err = h.users.GetUserByPhone(c.Request.Context(), login)
		}
	}
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz giriş bilgileri"})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hesap pasif durumda"})
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz giriş bilgileri"})
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		log.WithError(err).Error("Token üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token üretilemedi"})
		return
	}

	h.setSessionCookie(c, token)
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// Logout mevcut tarayıcı oturum cookie'sini siler.
func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(authCookieName, "", -1, "/", "", h.cookieSecure, true)
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) setSessionCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(authCookieName, token, int(auth.TokenTTL.Seconds()), "/", "", h.cookieSecure, true)
}

// ChangePasswordRequest şifre değiştirme JSON gövdesidir.
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=12,max=72"`
}

// ChangePassword kullanıcının şifresini değiştirir (JWT korumalı).
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	err := h.users.ChangePassword(c.Request.Context(), userID, req.OldPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, services.ErrWrongPassword) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Şifre değiştirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre değiştirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifre değiştirildi"})
}

// ThemeByLogin giriş tanımlayıcısına (e-posta, üye kodu veya telefon) göre
// kullanıcının tema rengini döndürür (herkese açık — login modalı önizlemesi).
func (h *AuthHandler) ThemeByLogin(c *gin.Context) {
	login := strings.ToUpper(strings.TrimSpace(c.Query("login")))
	if login == "" {
		c.JSON(http.StatusBadRequest, gin.H{"theme_color": nil})
		return
	}

	var (
		user *models.User
		err  error
	)
	if strings.HasPrefix(login, "TR90") {
		user, err = h.users.GetUserByMemberCode(c.Request.Context(), login)
	} else {
		user, err = h.users.GetUserByEmail(c.Request.Context(), login)
		if errors.Is(err, services.ErrUserNotFound) {
			user, err = h.users.GetUserByPhone(c.Request.Context(), login)
		}
	}
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, gin.H{"theme_color": nil})
			return
		}
		log.WithError(err).Error("Tema sorgusu başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tema sorgusu yapılamadı"})
		return
	}

	profile, err := h.users.GetProfile(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"theme_color": nil})
		return
	}
	color, _ := profile["theme_color"].(string)
	if color != "" {
		c.JSON(http.StatusOK, gin.H{"theme_color": color})
		return
	}
	c.JSON(http.StatusOK, gin.H{"theme_color": nil})
}
