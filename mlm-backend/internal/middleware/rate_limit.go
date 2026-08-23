package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"
)

// RateLimit belirli bir istemci IP'si için sabit zaman pencereli istek sınırı uygular.
func RateLimit(client *redis.Client, prefix string, limit int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		bucket := time.Now().Unix() / int64(window.Seconds())
		key := fmt.Sprintf("rate:%s:%s:%d", prefix, c.ClientIP(), bucket)

		pipe := client.TxPipeline()
		countCmd := pipe.Incr(c.Request.Context(), key)
		pipe.Expire(c.Request.Context(), key, window)
		if _, err := pipe.Exec(c.Request.Context()); err != nil {
			log.WithError(err).Warn("Hız sınırı kontrol edilemedi")
			c.Next()
			return
		}

		remaining := limit - countCmd.Val()
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		if countCmd.Val() > limit {
			c.Header("Retry-After", strconv.FormatInt(int64(window.Seconds()), 10))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Çok fazla istek; lütfen daha sonra tekrar deneyin"})
			return
		}

		c.Next()
	}
}
