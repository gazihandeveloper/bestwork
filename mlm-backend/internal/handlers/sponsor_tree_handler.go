package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// SponsorTreeHandler sponsorluk ağacı endpoint'lerini yönetir.
type SponsorTreeHandler struct {
	tree  *services.SponsorTreeService
	users *services.UserService
}

// NewSponsorTreeHandler yeni bir SponsorTreeHandler örneği döndürür.
func NewSponsorTreeHandler(tree *services.SponsorTreeService, users *services.UserService) *SponsorTreeHandler {
	return &SponsorTreeHandler{tree: tree, users: users}
}

// Get sponsorluk ağacını döndürür (JWT korumalı).
// Sorgu parametreleri: ?user_id=1&depth=3 (user_id yoksa JWT kullanıcısı;
// normal kullanıcılar yalnızca kendi ağacını görebilir, admin herkesi).
func (h *SponsorTreeHandler) Get(c *gin.Context) {
	requesterID := c.GetInt64("user_id")

	userID := requesterID
	if q := c.Query("user_id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz user_id değeri"})
			return
		}
		userID = id

		// Başkasının ağacı yalnızca admin tarafından görülebilir
		if userID != requesterID {
			requester, err := h.users.GetUserByID(c.Request.Context(), requesterID)
			if err != nil || requester.Role != "admin" {
				c.JSON(http.StatusForbidden, gin.H{"error": "Başka kullanıcının ağacını görme yetkiniz yok"})
				return
			}
		}
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

	tree, err := h.tree.GetSponsorTree(c.Request.Context(), userID, depth)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
			return
		}
		log.WithError(err).Error("Sponsorluk ağacı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sponsorluk ağacı getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tree": tree})
}
