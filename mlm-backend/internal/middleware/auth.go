package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/services"
)

// AuthRequired Bearer token'ı ve kullanıcının güncel aktiflik durumunu doğrular.
func AuthRequired(users *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookieName := "mlm_session"
		if c.GetHeader("X-Admin-Scope") == "1" {
			cookieName = "mlm_admin_session"
		}
		header := c.GetHeader("Authorization")
		tokenString := ""
		if strings.HasPrefix(header, "Bearer ") {
			tokenString = strings.TrimPrefix(header, "Bearer ")
		} else if cookieToken, err := c.Cookie(cookieName); err == nil {
			tokenString = cookieToken
			if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions && c.GetHeader("X-CSRF-Protection") != "1" {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF koruma başlığı eksik"})
				return
			}
		}
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Oturum bilgisi eksik"})
			return
		}

		claims, err := auth.ParseToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz veya süresi dolmuş token"})
			return
		}

		user, err := users.GetUserByID(c.Request.Context(), claims.UserID)
		if err != nil || !user.IsActive {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı bulunamadı veya hesap pasif"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_role", user.Role)
		c.Next()
	}
}

// AdminRequired AuthRequired'dan sonra çalışır; kullanıcının role alanını
// veritabanından kontrol eder ve admin/super_admin değilse 403 döndürür.
func AdminRequired(_ *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64("user_id")
		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
			return
		}

		role, ok := c.Get("user_role")
		if !ok || (role != "admin" && role != "super_admin") {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Bu işlem için admin yetkisi gerekli"})
			return
		}

		c.Next()
	}
}

// SuperAdminRequired AuthRequired'dan sonra çalışır; yalnızca super_admin
// rolüne izin verir. Ağaç taşıma, manuel rütbe ve manuel bakiye gibi kilitli
// işlemler bu middleware ile korunur (RBAC).
func SuperAdminRequired(_ *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64("user_id")
		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği"})
			return
		}

		role, ok := c.Get("user_role")
		if !ok || role != "super_admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Bu işlem için süper yönetici yetkisi gerekli"})
			return
		}

		c.Next()
	}
}
