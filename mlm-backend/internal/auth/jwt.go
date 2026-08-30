package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenTTL belirteçlerin ve oturum cookie'sinin geçerlilik süresidir.
const TokenTTL = 24 * time.Hour

// secret JWT imzalama anahtarıdır; uygulama başlarken config'ten set edilir.
var secret []byte

// InitSecret imzalama anahtarını doğrular ve ayarlar (main'den çağrılır).
func InitSecret(s string) error {
	if len([]byte(s)) < 32 {
		return fmt.Errorf("JWT_SECRET en az 32 bayt olmalıdır")
	}
	secret = []byte(s)
	return nil
}

// Claims JWT içinde taşınan özel alanları tanımlar.
type Claims struct {
	UserID int64 `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken verilen kullanıcı ID'si için 24 saat geçerli bir JWT üretir.
func GenerateToken(userID int64) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// ParseToken JWT'yi doğrular ve içindeki claims'i döndürür.
func ParseToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("beklenmeyen imza yöntemi")
		}
		return secret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("geçersiz veya süresi dolmuş token")
	}

	return claims, nil
}
