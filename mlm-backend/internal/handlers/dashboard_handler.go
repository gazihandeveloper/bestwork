package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// DashboardHandler dashboard ve raporlama endpoint'lerini yönetir.
type DashboardHandler struct {
	dash *services.DashboardService
}

// NewDashboardHandler yeni bir DashboardHandler örneği döndürür.
func NewDashboardHandler(dash *services.DashboardService) *DashboardHandler {
	return &DashboardHandler{dash: dash}
}

// Get kullanıcının tam dashboard verisini döndürür (JWT korumalı).
func (h *DashboardHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	dashboard, err := h.dash.GetUserDashboard(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Dashboard getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dashboard getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"dashboard": dashboard})
}

// Admin admin paneli özet istatistiklerini döndürür (admin).
func (h *DashboardHandler) Admin(c *gin.Context) {
	dashboard, err := h.dash.GetAdminDashboard(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Admin dashboard getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Admin dashboard getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"dashboard": dashboard})
}

// Summary kullanıcının kendi kazanç özetini döndürür (JWT korumalı).
func (h *DashboardHandler) Summary(c *gin.Context) {
	userID := c.GetInt64("user_id")

	summary, err := h.dash.GetDashboardSummary(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Özet getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Özet getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// Team kullanıcının ekip ve binary bacak özetini döndürür (JWT korumalı).
func (h *DashboardHandler) Team(c *gin.Context) {
	userID := c.GetInt64("user_id")

	team, err := h.dash.GetTeamSummary(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Ekip özeti getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ekip özeti getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"team": team})
}

// UserCard ağaç kartındaki "i" modalı için kullanıcı detayını döndürür (JWT korumalı).
// Sorgu parametresi: ?id=<user_id> (yoksa oturumdaki kullanıcı)
func (h *DashboardHandler) UserCard(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if q := c.Query("id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kullanıcı kimliği"})
			return
		}
		userID = id
	}

	card, err := h.dash.GetUserInfoCard(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
			return
		}
		log.WithError(err).Error("Kart bilgisi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kart bilgisi getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"card": card})
}

// Commissions kullanıcının komisyon geçmişini döndürür (JWT korumalı).
// Opsiyonel sorgu parametreleri: ?type=binary&limit=50
func (h *DashboardHandler) Commissions(c *gin.Context) {
	userID := c.GetInt64("user_id")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	commissionType := c.Query("type")

	commissions, err := h.dash.ListCommissions(c.Request.Context(), userID, commissionType, limit)
	if err != nil {
		log.WithError(err).Error("Komisyon geçmişi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Komisyon geçmişi getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"commissions": commissions})
}
