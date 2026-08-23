package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// BinaryTransactionHandler binary hareket endpoint'lerini yönetir.
type BinaryTransactionHandler struct {
	binaryTransactions *services.BinaryTransactionService
}

// NewBinaryTransactionHandler yeni bir BinaryTransactionHandler örneği döndürür.
func NewBinaryTransactionHandler(binaryTransactions *services.BinaryTransactionService) *BinaryTransactionHandler {
	return &BinaryTransactionHandler{binaryTransactions: binaryTransactions}
}

func parseBinaryFilters(c *gin.Context) (position, transactionType string, limit, offset int, ok bool) {
	position = c.Query("position")
	if position != "" && position != "L" && position != "R" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz position filtresi (L, R)"})
		return "", "", 0, 0, false
	}

	transactionType = c.Query("transaction_type")
	if transactionType != "" && transactionType != "add" && transactionType != "deduct" && transactionType != "reset" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz transaction_type filtresi (add, deduct, reset)"})
		return "", "", 0, 0, false
	}

	var err error
	limit, err = strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz limit değeri"})
		return "", "", 0, 0, false
	}
	offset, err = strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz offset değeri"})
		return "", "", 0, 0, false
	}
	return position, transactionType, limit, offset, true
}

// List kullanıcının kendi binary hareketlerini döndürür (JWT korumalı).
// Sorgu parametreleri: ?position=L|R&transaction_type=add|deduct|reset&limit=20&offset=0
func (h *BinaryTransactionHandler) List(c *gin.Context) {
	userID := c.GetInt64("user_id")

	position, transactionType, limit, offset, ok := parseBinaryFilters(c)
	if !ok {
		return
	}

	items, total, err := h.binaryTransactions.ListBinaryTransactions(c.Request.Context(), userID, position, transactionType, limit, offset)
	if err != nil {
		log.WithError(err).Error("Binary hareketler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Binary hareketler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transactions": items, "total": total, "limit": limit, "offset": offset})
}

// ListAll tüm kullanıcıların binary hareketlerini döndürür (admin).
func (h *BinaryTransactionHandler) ListAll(c *gin.Context) {
	position, transactionType, limit, offset, ok := parseBinaryFilters(c)
	if !ok {
		return
	}

	items, total, err := h.binaryTransactions.ListAllBinaryTransactions(c.Request.Context(), position, transactionType, limit, offset)
	if err != nil {
		log.WithError(err).Error("Binary hareketler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Binary hareketler listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transactions": items, "total": total, "limit": limit, "offset": offset})
}
