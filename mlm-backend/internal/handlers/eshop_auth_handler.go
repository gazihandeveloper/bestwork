package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// EshopAuthHandler, eshop storefront'unun (bestwork2) beklediği JWT-tabanlı
// auth sözleşmesini BestWork kullanıcılarına bağlar. Eshop {success, data}
// zarfı kullanır ve token'ları localStorage'da tutar; BestWork ise cookie +
// JWT üretir. Bu handler aradaki sözleşmeyi köprüler.
type EshopAuthHandler struct {
	users *services.UserService
}

// NewEshopAuthHandler yeni bir EshopAuthHandler döndürür.
func NewEshopAuthHandler(users *services.UserService) *EshopAuthHandler {
	return &EshopAuthHandler{users: users}
}

// eshopUser BestWork kullanıcısını eshop'un beklediği kullanıcı şekline çevirir.
func eshopUser(u *models.User) gin.H {
	first, last := "", ""
	if u.Name != "" {
		parts := strings.Fields(u.Name)
		first = parts[0]
		if len(parts) > 1 {
			last = strings.Join(parts[1:], " ")
		}
	}
	role := "customer"
	if u.Role == "admin" || u.Role == "super_admin" {
		role = "admin"
	}
	phone := ""
	if u.Phone != nil {
		phone = *u.Phone
	}
	return gin.H{
		"id":         strconv.FormatInt(u.ID, 10),
		"email":      u.Email,
		"first_name": first,
		"last_name":  last,
		"fullName":   u.Name,
		"phone":      phone,
		"role":       role,
		"isActive":   u.IsActive,
		"created_at": u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// resolveLogin BestWork login mantığını tekrarlar: TR90 → üye kodu,
// aksi halde e-posta → telefon → isim (tam eşleşme öncelikli).
func (h *EshopAuthHandler) resolveLogin(c *gin.Context, login string) (*models.User, error) {
	login = strings.TrimSpace(login)
	var (
		u   *models.User
		err error
	)
	if strings.HasPrefix(strings.ToUpper(login), "TR90") {
		u, err = h.users.GetUserByMemberCode(c.Request.Context(), login)
	} else {
		u, err = h.users.GetUserByEmail(c.Request.Context(), login)
		if errors.Is(err, services.ErrUserNotFound) {
			u, err = h.users.GetUserByPhone(c.Request.Context(), login)
		}
		if errors.Is(err, services.ErrUserNotFound) {
			u, err = h.users.GetUserByName(c.Request.Context(), login)
		}
	}
	return u, err
}

type eshopLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type eshopRegisterRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Phone           string `json:"phone"`
	Sponsor         string `json:"sponsor"`
}

// Register eshop'un POST /auth/register çağrısına karşılık verir.
// Eshop storefront müşterileri BestWork'te "user" (üye) rolüyle oluşturulur —
// sponsor opsiyoneldir; ilk ödenen siparişte MLM yerleşimine katılır.
func (h *EshopAuthHandler) Register(c *gin.Context) {
	var req eshopRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz istek gövdesi"})
		return
	}
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Şifreler eşleşmiyor"})
		return
	}
	name := strings.TrimSpace(strings.TrimSpace(req.FirstName) + " " + strings.TrimSpace(req.LastName))

	// Sponsor opsiyonel: TR90 ile başlayan değer üye kodu, değilse e-posta olarak aranır.
	var sponsorID *int64
	if s := strings.TrimSpace(req.Sponsor); s != "" {
		identifier := strings.ToUpper(s)
		var (
			sponsor *models.User
			err     error
		)
		if strings.HasPrefix(identifier, "TR90") {
			sponsor, err = h.users.GetUserByMemberCode(c.Request.Context(), identifier)
		} else {
			sponsor, err = h.users.GetUserByEmail(c.Request.Context(), s)
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Sponsor bulunamadı"})
			return
		}
		sponsorID = &sponsor.ID
	}

	user, err := h.users.CreateUser(c.Request.Context(), name, req.Email, req.Password, req.Phone, sponsorID, "user", nil)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmailExists), errors.Is(err, services.ErrPhoneExists):
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": err.Error()})
		default:
			log.WithError(err).Error("Eshop kayıt başarısız")
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		}
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		log.WithError(err).Error("Eshop kayıt token üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Token üretilemedi"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"access_token":  token,
			"refresh_token": token,
			"user":          eshopUser(user),
		},
	})
}

// Login eshop'un POST /auth/login çağrısına karşılık verir.
// Eshop "email" alanını kullanıcı adı olarak gönderir ("best" gibi).
func (h *EshopAuthHandler) Login(c *gin.Context) {
	var req eshopLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz istek gövdesi"})
		return
	}

	user, err := h.resolveLogin(c, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Geçersiz giriş bilgileri"})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Hesap pasif durumda"})
		return
	}
	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Geçersiz giriş bilgileri"})
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		log.WithError(err).Error("Eshop login token üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Token üretilemedi"})
		return
	}

	// Eshop refresh akışı ayrı bir refresh token bekler; BestWork tek JWT
	// ürettiğinden aynı token'ı refresh token olarak da döneriz (24h geçerli).
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"access_token":  token,
			"refresh_token": token,
			"user":          eshopUser(user),
		},
	})
}

type eshopRefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// Refresh eshop'un POST /auth/refresh çağrısına karşılık verir.
func (h *EshopAuthHandler) Refresh(c *gin.Context) {
	var req eshopRefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.RefreshToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Refresh token gerekli"})
		return
	}
	claims, err := auth.ParseToken(strings.TrimSpace(req.RefreshToken))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Geçersiz refresh token"})
		return
	}
	user, err := h.users.GetUserByID(c.Request.Context(), claims.UserID)
	if err != nil || !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Kullanıcı bulunamadı veya pasif"})
		return
	}
	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		log.WithError(err).Error("Eshop refresh token üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Token üretilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"access_token":  token,
			"refresh_token": token,
		},
	})
}

// Me eshop'un GET /users/me çağrısına karşılık verir (Bearer ile).
// middleware.AuthRequired zaten token'ı doğrulamıştır; user_id context'ten alınır.
func (h *EshopAuthHandler) Me(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Oturum bilgisi eksik"})
		return
	}
	user, err := h.users.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Kullanıcı bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": eshopUser(user)})
}
