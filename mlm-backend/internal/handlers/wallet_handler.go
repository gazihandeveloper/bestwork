package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// WalletHandler cüzdan ve çekim talebi endpoint'lerini yönetir.
type WalletHandler struct {
	wallets *services.WalletService
}

// NewWalletHandler yeni bir WalletHandler örneği döndürür.
func NewWalletHandler(wallets *services.WalletService) *WalletHandler {
	return &WalletHandler{wallets: wallets}
}

// WithdrawRequestPayload çekim talebi JSON gövdesidir.
type WithdrawRequestPayload struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Method string  `json:"method"`
}

// Get kullanıcının cüzdan bilgilerini döndürür (JWT korumalı).
func (h *WalletHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	wallet, err := h.wallets.GetWalletByUserID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, services.ErrWalletNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Cüzdan bulunamadı"})
			return
		}
		log.WithError(err).Error("Cüzdan getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cüzdan getirilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"wallet": wallet})
}

// CreateWithdraw yeni çekim talebi oluşturur (JWT korumalı).
func (h *WalletHandler) CreateWithdraw(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req WithdrawRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	wr, err := h.wallets.CreateWithdrawRequest(c.Request.Context(), userID, req.Amount, req.Method)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWithdrawAmountTooLow),
			errors.Is(err, services.ErrInsufficientBalance):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Çekim talebi oluşturulamadı")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Çekim talebi oluşturulamadı"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"withdraw_request": wr})
}

// ListWithdraws kullanıcının kendi çekim taleplerini döndürür (JWT korumalı).
func (h *WalletHandler) ListWithdraws(c *gin.Context) {
	userID := c.GetInt64("user_id")

	requests, err := h.wallets.ListUserWithdrawRequests(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Çekim talepleri listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Çekim talepleri listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"withdraw_requests": requests})
}
