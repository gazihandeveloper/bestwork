package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// PaymentNotificationHandler ödeme bildirimi endpoint'lerini yönetir.
type PaymentNotificationHandler struct {
	notifications *services.PaymentNotificationService
}

// NewPaymentNotificationHandler yeni bir PaymentNotificationHandler örneği döndürür.
func NewPaymentNotificationHandler(notifications *services.PaymentNotificationService) *PaymentNotificationHandler {
	return &PaymentNotificationHandler{notifications: notifications}
}

// CreatePaymentNotificationPayload bildirim JSON gövdesidir.
type CreatePaymentNotificationPayload struct {
	OrderID     *int64  `json:"order_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	BankName    string  `json:"bank_name"`
	ReferenceNo string  `json:"reference_no"`
	Note        string  `json:"note"`
	FilePath    string  `json:"file_path"`
}

// Create yeni ödeme bildirimi oluşturur (JWT korumalı).
func (h *PaymentNotificationHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req CreatePaymentNotificationPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	pn, err := h.notifications.CreatePaymentNotification(c.Request.Context(), userID, req.OrderID,
		req.Amount, req.BankName, req.ReferenceNo, req.Note, req.FilePath)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Sipariş bulunamadı"})
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPaymentAmountMismatch),
			errors.Is(err, services.ErrPaymentNotificationExists),
			errors.Is(err, services.ErrOrderNotPending):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"payment_notification": pn})
}

// List kullanıcının kendi bildirimlerini döndürür (JWT korumalı).
func (h *PaymentNotificationHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz limit değeri"})
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz offset değeri"})
		return
	}

	items, total, err := h.notifications.ListUserPaymentNotifications(c.Request.Context(), userID, limit, offset)
	if err != nil {
		log.WithError(err).Error("Bildirimler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bildirimler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"payment_notifications": items, "total": total, "limit": limit, "offset": offset})
}
