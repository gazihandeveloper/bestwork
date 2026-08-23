package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// OrderHandler sipariş endpoint'lerini yönetir.
type OrderHandler struct {
	orders *services.OrderService
}

// NewOrderHandler yeni bir OrderHandler örneği döndürür.
func NewOrderHandler(orders *services.OrderService) *OrderHandler {
	return &OrderHandler{orders: orders}
}

// CreateOrderRequest sipariş oluşturma JSON gövdesidir.
type CreateOrderRequest struct {
	Items         []services.OrderItemInput `json:"items" binding:"required,min=1"`
	PaymentMethod string                    `json:"payment_method"`
}

// Create kullanıcı adına sipariş oluşturur (JWT korumalı).
func (h *OrderHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	if req.PaymentMethod != "" && req.PaymentMethod != "eft_havale" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Yalnızca EFT/HAVALE ödeme yöntemi kullanılabilir"})
		return
	}

	order, err := h.orders.CreateOrder(c.Request.Context(), userID, req.PaymentMethod, req.Items)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductNotFound),
			errors.Is(err, services.ErrInsufficientStock),
			errors.Is(err, services.ErrInvalidQuantity),
			errors.Is(err, services.ErrEmptyOrder),
			errors.Is(err, services.ErrCardPaymentUnavailable):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Sipariş oluşturulamadı")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Sipariş oluşturulamadı"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"order": order})
}

// List kullanıcının kendi siparişlerini döndürür (JWT korumalı).
func (h *OrderHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	orders, err := h.orders.ListOrdersByUser(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Siparişler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Siparişler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// Get sipariş detayını döndürür; kullanıcı yalnızca kendi siparişini görebilir (JWT korumalı).
func (h *OrderHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz sipariş ID"})
		return
	}

	order, err := h.orders.GetOrderByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrOrderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sipariş bulunamadı"})
			return
		}
		log.WithError(err).Error("Sipariş getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sipariş getirilemedi"})
		return
	}

	if order.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sipariş bulunamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}
