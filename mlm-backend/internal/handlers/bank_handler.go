package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// BankHandler banka hesabı endpoint'lerini yönetir.
type BankHandler struct {
	banks *services.BankService
}

// NewBankHandler yeni bir BankHandler örneği döndürür.
func NewBankHandler(banks *services.BankService) *BankHandler {
	return &BankHandler{banks: banks}
}

// BankAccountPayload banka hesabı JSON gövdesidir.
type BankAccountPayload struct {
	BankName    string `json:"bank_name" binding:"required"`
	IBAN        string `json:"iban" binding:"required"`
	AccountName string `json:"account_name" binding:"required"`
}

// List kullanıcının banka hesaplarını döndürür (JWT korumalı).
func (h *BankHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	accounts, err := h.banks.ListBankAccountsByUser(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Banka hesapları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Banka hesapları listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bank_accounts": accounts})
}

// Create yeni banka hesabı ekler (JWT korumalı).
func (h *BankHandler) Create(c *gin.Context) {
	userID := c.GetInt64("user_id")

	var req BankAccountPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	ba, err := h.banks.CreateBankAccount(c.Request.Context(), userID, req.BankName, req.IBAN, req.AccountName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"bank_account": ba})
}

// Update banka hesabını günceller (JWT korumalı, yalnızca sahibi).
func (h *BankHandler) Update(c *gin.Context) {
	userID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz hesap ID"})
		return
	}

	var req BankAccountPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi: " + err.Error()})
		return
	}

	existing, err := h.banks.GetBankAccountByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrBankAccountNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Banka hesabı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Banka hesabı getirilemedi"})
		return
	}
	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu hesaba erişim izniniz yok"})
		return
	}

	if err := h.banks.UpdateBankAccount(c.Request.Context(), id, req.BankName, req.IBAN, req.AccountName); err != nil {
		log.WithError(err).Error("Banka hesabı güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banka hesabı güncellendi"})
}

// Delete banka hesabını pasife alır (JWT korumalı, yalnızca sahibi).
func (h *BankHandler) Delete(c *gin.Context) {
	userID := c.GetInt64("user_id")

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz hesap ID"})
		return
	}

	existing, err := h.banks.GetBankAccountByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrBankAccountNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Banka hesabı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Banka hesabı getirilemedi"})
		return
	}
	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu hesaba erişim izniniz yok"})
		return
	}

	if err := h.banks.DeleteBankAccount(c.Request.Context(), id); err != nil {
		log.WithError(err).Error("Banka hesabı silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Banka hesabı pasife alındı"})
}
