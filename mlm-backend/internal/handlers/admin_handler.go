package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// AdminHandler admin (çekim onay/red, bekleyenler, ödeme bildirimleri, aylık kapanış, ay sonu cron) endpoint'lerini yönetir.
type AdminHandler struct {
	wallets      *services.WalletService
	chips        *services.ChipService
	monthlyClose *services.MonthlyCloseService
	pendingPool  *services.PendingPoolService
	payments     *services.PaymentNotificationService
}

// NewAdminHandler yeni bir AdminHandler örneği döndürür.
func NewAdminHandler(wallets *services.WalletService, chips *services.ChipService, monthlyClose *services.MonthlyCloseService, pendingPool *services.PendingPoolService, payments *services.PaymentNotificationService) *AdminHandler {
	return &AdminHandler{wallets: wallets, chips: chips, monthlyClose: monthlyClose, pendingPool: pendingPool, payments: payments}
}

// ListPaymentNotifications tüm ödeme bildirimlerini döndürür (admin).
func (h *AdminHandler) ListPaymentNotifications(c *gin.Context) {
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

	items, total, err := h.payments.ListAllPaymentNotifications(c.Request.Context(), limit, offset)
	if err != nil {
		log.WithError(err).Error("Bildirimler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bildirimler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"payment_notifications": items, "total": total, "limit": limit, "offset": offset})
}

// ApprovePaymentNotification ödeme bildirimini onaylar (admin).
func (h *AdminHandler) ApprovePaymentNotification(c *gin.Context) {
	adminID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz bildirim ID"})
		return
	}

	err = h.payments.ApprovePaymentNotification(c.Request.Context(), id, adminID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPaymentNotificationNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPaymentAlreadyProcessed):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrOrderNotPending),
			errors.Is(err, services.ErrPaymentAmountMismatch),
			errors.Is(err, services.ErrOrderNotPaid):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Ödeme bildirimi onaylanamadı")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ödeme bildirimi onaylanamadı"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ödeme bildirimi onaylandı"})
}

// RejectPaymentNotification ödeme bildirimini reddeder (admin).
func (h *AdminHandler) RejectPaymentNotification(c *gin.Context) {
	adminID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz bildirim ID"})
		return
	}

	err = h.payments.RejectPaymentNotification(c.Request.Context(), id, adminID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPaymentNotificationNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPaymentAlreadyProcessed):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Ödeme bildirimi reddedilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ödeme bildirimi reddedilemedi"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ödeme bildirimi reddedildi"})
}

// ListPendingPool tüm bekleyen kullanıcıları sponsor bilgisiyle döndürür (admin).
func (h *AdminHandler) ListPendingPool(c *gin.Context) {
	entries, err := h.pendingPool.ListAllPendingUsers(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Bekleyenler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bekleyenler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pending_users": entries})
}

// PlacePendingUser adminin bekleyen bir kullanıcıyı seçtiği sponsorun altına yerleştirmesini sağlar.
func (h *AdminHandler) PlacePendingUser(c *gin.Context) {
	var req struct {
		UserID    int64  `json:"user_id" binding:"required"`
		SponsorID int64  `json:"sponsor_id" binding:"required"`
		Position  string `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	err := h.pendingPool.PlaceUserByAdmin(c.Request.Context(), req.SponsorID, req.UserID, req.Position)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidPosition),
			errors.Is(err, services.ErrUserAlreadyPlaced),
			errors.Is(err, services.ErrPoolEntryNotFound),
			errors.Is(err, services.ErrPositionOccupied),
			errors.Is(err, services.ErrInvalidPlacement),
			errors.Is(err, services.ErrInactiveUser),
			errors.Is(err, services.ErrPlacementRequiresPurchase):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserNotFound),
			errors.Is(err, services.ErrSponsorNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Kullanıcı ağaca yerleştirilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı ağaca yerleştirilemedi"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı ağaca yerleştirildi"})
}

// ListWithdrawals tüm çekim taleplerini döndürür (JWT korumalı; admin rolü sonraki görevde).
func (h *AdminHandler) ListWithdrawals(c *gin.Context) {
	requests, err := h.wallets.ListAllWithdrawRequests(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Çekim talepleri listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Çekim talepleri listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"withdraw_requests": requests})
}

// ApproveWithdrawal çekim talebini onaylar (JWT korumalı).
func (h *AdminHandler) ApproveWithdrawal(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz talep ID"})
		return
	}

	err = h.wallets.ApproveWithdrawRequest(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWithdrawRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrWithdrawAlreadyProcessed),
			errors.Is(err, services.ErrInsufficientBalance),
			errors.Is(err, services.ErrWalletNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Çekim talebi onaylanamadı")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Çekim talebi onaylanamadı"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Çekim talebi onaylandı"})
}

// RejectWithdrawal çekim talebini reddeder (JWT korumalı).
func (h *AdminHandler) RejectWithdrawal(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz talep ID"})
		return
	}

	err = h.wallets.RejectWithdrawRequest(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWithdrawRequestNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrWithdrawAlreadyProcessed):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Çekim talebi reddedilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Çekim talebi reddedilemedi"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Çekim talebi reddedildi"})
}

// MonthlyClose aylık kapanışı çalıştırır: toplu binary eşleşme + rütbe +
// %5 chip kesintisi + binary kazanç sıfırlama (admin).
// Idempotent: aynı ay tekrar çağrılırsa hiçbir değişiklik yapılmaz.
func (h *AdminHandler) MonthlyClose(c *gin.Context) {
	if err := h.monthlyClose.ProcessMonthlyClose(); err != nil {
		if errors.Is(err, services.ErrMonthlyJobAlreadyRun) {
			c.JSON(http.StatusOK, gin.H{"message": "Bu ay için aylık kapanış zaten çalıştırılmış", "executed": false})
			return
		}
		log.WithError(err).Error("Aylık kapanış başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Aylık kapanış başarısız"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Aylık kapanış tamamlandı", "executed": true})
}

// MonthlyReset chip kesintisi ve binary kazanç sıfırlama işlemlerini çalıştırır (admin).
// Her ikisi de idempotenttir; aynı ay tekrar çağrılırsa değişiklik yapılmaz.
func (h *AdminHandler) MonthlyReset(c *gin.Context) {
	chipErr := h.chips.ApplyMonthlyChipDeduction()
	if chipErr != nil && !errors.Is(chipErr, services.ErrMonthlyJobAlreadyRun) {
		log.WithError(chipErr).Error("Aylık chip kesintisi başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Aylık chip kesintisi başarısız"})
		return
	}

	resetErr := h.chips.ResetMonthlyBinaryEarnings()
	if resetErr != nil && !errors.Is(resetErr, services.ErrMonthlyJobAlreadyRun) {
		log.WithError(resetErr).Error("Aylık binary sıfırlama başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Aylık binary sıfırlama başarısız"})
		return
	}

	chipDone := errors.Is(chipErr, services.ErrMonthlyJobAlreadyRun)
	resetDone := errors.Is(resetErr, services.ErrMonthlyJobAlreadyRun)

	if chipDone && resetDone {
		c.JSON(http.StatusOK, gin.H{"message": "Bu ay için ay sonu işlemleri zaten çalıştırılmış", "executed": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ay sonu işlemleri tamamlandı", "executed": true})
}
