package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
)

// HealthCheck PostgreSQL ve Redis'in durumunu kontrol eden endpoint handler'ıdır.
func HealthCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	postgresStatus := "up"
	redisStatus := "up"

	// PostgreSQL: SELECT 1 sorgusu ile canlılık kontrolü
	if db := database.GetDB(); db == nil {
		postgresStatus = "down"
	} else {
		var one int
		if err := db.QueryRow(ctx, "SELECT 1").Scan(&one); err != nil {
			log.WithError(err).Error("PostgreSQL sağlık kontrolü başarısız")
			postgresStatus = "down"
		}
	}

	// Redis: PING komutu ile canlılık kontrolü
	if r := database.GetRedis(); r == nil {
		redisStatus = "down"
	} else if err := r.Ping(ctx).Err(); err != nil {
		log.WithError(err).Error("Redis sağlık kontrolü başarısız")
		redisStatus = "down"
	}

	response := gin.H{
		"status":   "ok",
		"postgres": postgresStatus,
		"redis":    redisStatus,
	}

	if postgresStatus == "up" && redisStatus == "up" {
		c.JSON(http.StatusOK, response)
		return
	}

	response["status"] = "error"
	c.JSON(http.StatusServiceUnavailable, response)
}
