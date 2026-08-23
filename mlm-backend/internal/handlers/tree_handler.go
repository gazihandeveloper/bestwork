package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// TreeHandler binary ağaç görünümü endpoint'lerini yönetir.
type TreeHandler struct {
	dash *services.DashboardService
}

// NewTreeHandler yeni bir TreeHandler örneği döndürür.
func NewTreeHandler(dash *services.DashboardService) *TreeHandler {
	return &TreeHandler{dash: dash}
}

// Get belirtilen kullanıcının binary alt ağacını döndürür (JWT korumalı).
// Sorgu parametreleri: ?user_id=1&depth=3 (user_id yoksa JWT kullanıcısı; depth varsayılan 3, max 5).
func (h *TreeHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	if q := c.Query("user_id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz user_id değeri"})
			return
		}
		userID = id
	}

	depth := 3
	if q := c.Query("depth"); q != "" {
		d, err := strconv.Atoi(q)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz depth değeri"})
			return
		}
		depth = d
	}

	tree, err := h.dash.GetTree(c.Request.Context(), userID, depth)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
			return
		}
		log.WithError(err).Error("Ağaç verisi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ağaç verisi getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tree": tree})
}
