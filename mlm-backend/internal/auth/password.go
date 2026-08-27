package auth

import (
	"errors"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

const MinPasswordLength = 8

// ValidatePassword bcrypt sınırlarıyla uyumlu parola politikasını uygular.
func ValidatePassword(password string) error {
	length := utf8.RuneCountInString(password)
	if length < MinPasswordLength {
		return errors.New("şifre en az 8 karakter olmalıdır")
	}
	if len([]byte(password)) > 72 {
		return errors.New("şifre en fazla 72 bayt olmalıdır")
	}
	return nil
}

// HashPassword düz metin şifreyi bcrypt ile hash'ler.
func HashPassword(plain string) (string, error) {
	if err := ValidatePassword(plain); err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// HashToken kısa, tek kullanımlık kodları (sıfırlama kodu vb.) şifre politikasına
// takılmadan bcrypt ile hash'ler.
func HashToken(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CheckPassword düz metin şifrenin hash ile eşleşip eşleşmediğini döndürür.
func CheckPassword(plain, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
