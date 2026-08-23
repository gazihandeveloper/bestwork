package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

// Config uygulamanın çalışması için gereken tüm ayarları tutar.
type Config struct {
	AppPort          string
	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDB       string
	RedisHost        string
	RedisPort        string
	RedisPassword    string
	JWTSecret        string
	CookieSecure     bool
	GinMode          string
	CORSOrigins      string
}

// LoadConfig .env dosyasını yükler ve ortam değişkenlerinden Config üretir.
func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Warnf(".env dosyası bulunamadı, sistem ortam değişkenleri kullanılacak: %v", err)
	}

	return &Config{
		AppPort:          getEnv("APP_PORT", "8080"),
		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnv("POSTGRES_PORT", "5432"),
		PostgresUser:     getEnv("POSTGRES_USER", "mlm_user"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", ""),
		PostgresDB:       getEnv("POSTGRES_DB", "mlm_db"),
		RedisHost:        getEnv("REDIS_HOST", "localhost"),
		RedisPort:        getEnv("REDIS_PORT", "6379"),
		RedisPassword:    getEnv("REDIS_PASSWORD", ""),
		JWTSecret:        getEnv("JWT_SECRET", ""),
		CookieSecure:     getEnv("COOKIE_SECURE", "false") == "true",
		GinMode:          getEnv("GIN_MODE", "debug"),
		CORSOrigins:      getEnv("CORS_ORIGINS", "http://localhost:3000"),
	}
}

// PostgresURI pgx'in beklediği formatta bağlantı URI'sini üretir.
func (c *Config) PostgresURI() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s",
		c.PostgresUser, c.PostgresPassword, c.PostgresHost, c.PostgresPort, c.PostgresDB,
	)
}

// RedisAddr go-redis'in beklediği adres formatını üretir (host:port).
func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

// getEnv verilen anahtar yoksa varsayılan değeri döndürür.
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}
