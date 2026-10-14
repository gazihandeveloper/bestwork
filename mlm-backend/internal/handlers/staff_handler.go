package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/services"
)

// StaffHandler panel çalışanları ve menü izinleri (RBAC) uçlarını yönetir.
type StaffHandler struct {
	staff *services.StaffService
}

func NewStaffHandler(staff *services.StaffService) *StaffHandler {
	return &StaffHandler{staff: staff}
}

// adminGuard çalışan rolünün çalışan yönetmesini engeller.
func (h *StaffHandler) adminGuard(c *gin.Context) bool {
	if r, _ := c.Get("user_role"); r == "staff" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Bu işlem için yönetici yetkisi gerekli"})
		return false
	}
	return true
}

type staffRequest struct {
	Name     string   `json:"name"`
	Email    string   `json:"email"`
	Phone    string   `json:"phone"`
	Password string   `json:"password"`
	Menus    []string `json:"menus"`
}

// List GET /api/admin/staff
func (h *StaffHandler) List(c *gin.Context) {
	if !h.adminGuard(c) {
		return
	}
	rows, err := h.staff.List(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Çalışanlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Çalışanlar listelenemedi"})
		return
	}
	out := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		out = append(out, gin.H{
			"id":         r.User.ID,
			"name":       r.User.Name,
			"email":      r.User.Email,
			"phone":      r.User.Phone,
			"is_active":  r.User.IsActive,
			"created_at": r.User.CreatedAt,
			"menus":      r.Menus,
		})
	}
	c.JSON(http.StatusOK, gin.H{"staff": out})
}

// Create POST /api/admin/staff
func (h *StaffHandler) Create(c *gin.Context) {
	if !h.adminGuard(c) {
		return
	}
	var req staffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if strings.TrimSpace(req.Password) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Şifre zorunludur"})
		return
	}
	u, err := h.staff.Create(c.Request.Context(), req.Name, req.Email, req.Phone, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrEmailExists) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.staff.SetMenus(c.Request.Context(), u.ID, req.Menus); err != nil {
		log.WithError(err).Warn("Çalışan menü izinleri kaydedilemedi")
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Çalışan oluşturuldu", "id": u.ID})
}

// Update PUT /api/admin/staff/:id
func (h *StaffHandler) Update(c *gin.Context) {
	if !h.adminGuard(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz çalışan ID"})
		return
	}
	var req staffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	ctx := c.Request.Context()
	if err := h.staff.UpdateInfo(ctx, id, req.Name, req.Email, req.Phone); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrEmailExists):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	if strings.TrimSpace(req.Password) != "" {
		if err := h.staff.UpdatePassword(ctx, id, req.Password); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if err := h.staff.SetMenus(ctx, id, req.Menus); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Menü izinleri kaydedilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Çalışan güncellendi"})
}

// Delete DELETE /api/admin/staff/:id
func (h *StaffHandler) Delete(c *gin.Context) {
	if !h.adminGuard(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz çalışan ID"})
		return
	}
	if id == c.GetInt64("user_id") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kendi hesabınızı silemezsiniz"})
		return
	}
	deleted, err := h.staff.Delete(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Çalışan silinemedi"})
		return
	}
	if deleted {
		c.JSON(http.StatusOK, gin.H{"message": "Çalışan silindi"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": "Bağlı kayıtları olduğu için çalışan pasife alındı"})
	}
}

// MyPermissions GET /api/admin/me/permissions — giriş yapanın rolü ve menüleri.
func (h *StaffHandler) MyPermissions(c *gin.Context) {
	role, _ := c.Get("user_role")
	roleStr, _ := role.(string)
	if roleStr == "admin" || roleStr == "super_admin" {
		c.JSON(http.StatusOK, gin.H{"role": roleStr, "menus": []string{"*"}})
		return
	}
	menus, err := h.staff.MenusFor(c.Request.Context(), c.GetInt64("user_id"))
	if err != nil {
		menus = []string{}
	}
	c.JSON(http.StatusOK, gin.H{"role": roleStr, "menus": menus})
}
