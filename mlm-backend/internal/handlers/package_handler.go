package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// PackageHandler paket endpoint'lerini yönetir.
type PackageHandler struct {
	packages *services.PackageService
}

// NewPackageHandler yeni bir PackageHandler örneği döndürür.
func NewPackageHandler(packages *services.PackageService) *PackageHandler {
	return &PackageHandler{packages: packages}
}

// PackageRequest paket oluşturma/güncelleme JSON gövdesidir.
type PackageRequest struct {
	Name              string  `json:"name" binding:"required"`
	Price             float64 `json:"price" binding:"gte=0"`
	ReferralBonusRate float64 `json:"referral_bonus_rate" binding:"gte=0,lte=1"`
	BinaryBonusRate   float64 `json:"binary_bonus_rate" binding:"gte=0,lte=1"`
	MatchingBonusRate float64 `json:"matching_bonus_rate" binding:"gte=0,lte=1"`
	DiscountRate      float64 `json:"discount_rate" binding:"gte=0,lte=1"`
	RequiredPV        int64   `json:"required_pv" binding:"gte=0"`
	CV                int64   `json:"cv" binding:"gte=0"`
}

// List tüm paketleri döndürür (herkese açık).
func (h *PackageHandler) List(c *gin.Context) {
	packages, err := h.packages.ListPackages(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Paketler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Paketler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"packages": packages})
}

// Create yeni paket ekler (admin).
func (h *PackageHandler) Create(c *gin.Context) {
	var req PackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	p, err := h.packages.CreatePackage(c.Request.Context(), req.Name, req.Price,
		req.ReferralBonusRate, req.BinaryBonusRate, req.MatchingBonusRate, req.DiscountRate, req.RequiredPV, req.CV)
	if err != nil {
		log.WithError(err).Error("Paket oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"package": p})
}

// Update paketi günceller (admin).
func (h *PackageHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz paket ID"})
		return
	}

	var req PackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	p, err := h.packages.GetPackageByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrPackageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Paket bulunamadı"})
			return
		}
		log.WithError(err).Error("Paket getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Paket getirilemedi"})
		return
	}

	p.Name = req.Name
	p.Price = req.Price
	p.ReferralBonusRate = req.ReferralBonusRate
	p.BinaryBonusRate = req.BinaryBonusRate
	p.MatchingBonusRate = req.MatchingBonusRate
	p.DiscountRate = req.DiscountRate
	p.RequiredPV = req.RequiredPV
	p.CV = req.CV

	if err := h.packages.UpdatePackage(c.Request.Context(), p); err != nil {
		log.WithError(err).Error("Paket güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"package": p})
}

// Delete paketi siler (admin).
func (h *PackageHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz paket ID"})
		return
	}

	if err := h.packages.DeletePackage(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrPackageNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Paket bulunamadı"})
			return
		}
		log.WithError(err).Error("Paket silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Paket silindi"})
}
