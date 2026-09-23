package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// EarningPlanHandler kazanç planı (Network Ayarları) endpoint'lerini yönetir.
type EarningPlanHandler struct {
	plans *services.EarningPlanService
}

// NewEarningPlanHandler yeni bir EarningPlanHandler örneği döndürür.
func NewEarningPlanHandler(plans *services.EarningPlanService) *EarningPlanHandler {
	return &EarningPlanHandler{plans: plans}
}

// EarningPlanRequest kazanç kalemi oluşturma/güncelleme gövdesidir.
type EarningPlanRequest struct {
	Code          string                     `json:"code"`
	Title         string                     `json:"title" binding:"required"`
	Description   *string                    `json:"description"`
	PayoutType    string                     `json:"payout_type"`
	MaxRate       float64                    `json:"max_rate"`
	Scope         string                     `json:"scope"`
	Period        string                     `json:"period"`
	ActivityMode  string                     `json:"activity_mode"`
	CheckMatching bool                       `json:"check_matching"`
	Depth         int                        `json:"depth"`
	SortOrder     int                        `json:"sort_order"`
	IsActive      *bool                      `json:"is_active"`
	Rates         []models.EarningPlanRate   `json:"rates"`
}

func (r EarningPlanRequest) toModel() *models.EarningPlan {
	active := true
	if r.IsActive != nil {
		active = *r.IsActive
	}
	payout := r.PayoutType
	if payout == "" {
		payout = "gelir"
	}
	scope := r.Scope
	if scope == "" {
		scope = "tree"
	}
	period := r.Period
	if period == "" {
		period = "monthly"
	}
	activity := r.ActivityMode
	if activity == "" {
		activity = "none"
	}
	return &models.EarningPlan{
		Code:          r.Code,
		Title:         r.Title,
		Description:   r.Description,
		PayoutType:    payout,
		MaxRate:       r.MaxRate,
		Scope:         scope,
		Period:        period,
		ActivityMode:  activity,
		CheckMatching: r.CheckMatching,
		Depth:         r.Depth,
		SortOrder:     r.SortOrder,
		IsActive:      active,
		Rates:         r.Rates,
	}
}

// List kazanç kalemlerini döndürür (admin).
func (h *EarningPlanHandler) List(c *gin.Context) {
	onlyActive := c.Query("active") == "1"
	plans, err := h.plans.List(c.Request.Context(), onlyActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kazanç kalemleri listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// Get tek kalemi döndürür.
func (h *EarningPlanHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ID"})
		return
	}
	p, err := h.plans.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrEarningPlanNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kazanç kalemi bulunamadı"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plan": p})
}

// Create yeni kalem ekler.
func (h *EarningPlanHandler) Create(c *gin.Context) {
	var req EarningPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	p, err := h.plans.Create(c.Request.Context(), req.toModel())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"plan": p})
}

// Update kalemi günceller.
func (h *EarningPlanHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ID"})
		return
	}
	var req EarningPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	m := req.toModel()
	m.ID = id
	p, err := h.plans.Update(c.Request.Context(), m)
	if err != nil {
		if errors.Is(err, services.ErrEarningPlanNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kazanç kalemi bulunamadı"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plan": p})
}

// Delete kalemi siler.
func (h *EarningPlanHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ID"})
		return
	}
	if err := h.plans.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrEarningPlanNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kazanç kalemi bulunamadı"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kazanç kalemi silindi"})
}
