package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// TicketHandler iletişim endpoint'lerini yönetir.
type TicketHandler struct {
	tickets *services.TicketService
}

// NewTicketHandler yeni bir TicketHandler örneği döndürür.
func NewTicketHandler(tickets *services.TicketService) *TicketHandler {
	return &TicketHandler{tickets: tickets}
}

// TicketRequest ticket oluşturma JSON gövdesidir.
type TicketRequest struct {
	Name    string `json:"name" binding:"required"`
	Surname string `json:"surname" binding:"required"`
	Phone   string `json:"phone" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// Create yeni destek kaydı oluşturur (herkese açık; oturum varsa kullanıcıya bağlanır).
func (h *TicketHandler) Create(c *gin.Context) {
	var req TicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	var userID *int64
	if uid := c.GetInt64("user_id"); uid != 0 {
		userID = &uid
	}

	t, err := h.tickets.CreateTicket(c.Request.Context(), userID, req.Name, req.Surname, req.Phone, req.Message)
	if err != nil {
		log.WithError(err).Error("Ticket kaydedilemedi")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ticket": t})
}

// Resolve açık destek talebini çözüldü olarak işaretler (admin).
func (h *TicketHandler) Resolve(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz talep ID"})
		return
	}
	if err := h.tickets.UpdateStatus(c.Request.Context(), id, "resolved"); err != nil {
		log.WithError(err).Error("Talep çözülemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Talep çözülemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Talep çözüldü"})
}

// Get tek destek talebini döndürür (admin).
func (h *TicketHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz talep ID"})
		return
	}
	t, err := h.tickets.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Talep bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ticket": t})
}

// Reply talebe yönetim yanıtı ekler.
func (h *TicketHandler) Reply(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz talep ID"})
		return
	}
	var req struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mesaj gerekli"})
		return
	}
	t, err := h.tickets.AppendMessage(c.Request.Context(), id, "[Yönetim]: "+strings.TrimSpace(req.Message))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Yanıt eklenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ticket": t})
}

// ListAll tüm ticketları döndürür (JWT + admin).
func (h *TicketHandler) ListAll(c *gin.Context) {
	tickets, err := h.tickets.ListAll(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Ticketlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ticketlar listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}
