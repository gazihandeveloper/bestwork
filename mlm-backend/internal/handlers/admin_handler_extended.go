package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
	"mlm-backend/internal/services"
)

// Yönetim paneli genişletme endpoint'leri:
// üye listesi, rütbe güncelleme, sipariş yönetimi, cüzdan yönetimi,
// ağaç taşıma, denetim logları, raporlar, KYC ve fraud taraması.

// ListUsers üyeleri arama + sayfalama ile döndürür (admin).
func (h *AdminHandler) ListUsers(c *gin.Context) {
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
	users, total, err := h.users.ListUsers(c.Request.Context(), c.Query("q"), c.Query("role"), limit, offset)
	if err != nil {
		log.WithError(err).Error("Üyeler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Üyeler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users, "total": total, "limit": limit, "offset": offset})
}

// UpdateUserRank üyenin rütbesini manuel günceller (admin, denetim loglu).
func (h *AdminHandler) UpdateUserRank(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	var req struct {
		RankID int    `json:"rank_id" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.users.UpdateUserRank(c.Request.Context(), c.GetInt64("user_id"), "", userID, req.RankID, req.Reason); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Rütbe güncellenemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rütbe güncellendi"})
}

// ListOrders tüm siparişleri filtreli ve sayfalı döndürür (admin).
func (h *AdminHandler) ListOrders(c *gin.Context) {
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
	orders, total, err := h.orders.ListAllOrders(c.Request.Context(), limit, offset, c.Query("status"), c.Query("type"), c.Query("q"))
	if err != nil {
		log.WithError(err).Error("Siparişler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Siparişler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders, "total": total, "limit": limit, "offset": offset})
}

// UpdateOrderStatus sipariş durumunu günceller (admin, denetim loglu).
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz sipariş ID"})
		return
	}
	var req struct {
		Status       string `json:"status" binding:"required"`
		TrackingCode string `json:"tracking_code"`
		Note         string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.orders.UpdateOrderStatus(c.Request.Context(), c.GetInt64("user_id"), "", orderID, req.Status, req.TrackingCode, req.Note); err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Sipariş durumu güncellenemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Sipariş durumu güncellendi"})
}

// AdminWallet üyenin cüzdanını hareketleriyle birlikte döndürür (admin).
func (h *AdminHandler) AdminWallet(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	wallet, err := h.wallets.GetWalletByUserID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, services.ErrWalletNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Cüzdan okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cüzdan okunamadı"})
		return
	}
	txs, err := h.wallets.ListWalletTransactions(c.Request.Context(), userID, 50, 0)
	if err != nil {
		log.WithError(err).Error("Cüzdan hareketleri okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cüzdan hareketleri okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"wallet": wallet, "transactions": txs})
}

// AdminWalletTransactions cüzdan hareket defterini döndürür (admin).
func (h *AdminHandler) AdminWalletTransactions(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	txs, err := h.wallets.ListWalletTransactions(c.Request.Context(), userID, limit, offset)
	if err != nil {
		if errors.Is(err, services.ErrWalletNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("Cüzdan hareketleri okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cüzdan hareketleri okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"transactions": txs})
}

// AdminWalletAdjust admin cüzdan manuel işlemi (add/subtract/block/unblock).
func (h *AdminHandler) AdminWalletAdjust(c *gin.Context) {
	var req struct {
		UserID int64   `json:"user_id" binding:"required"`
		Amount float64 `json:"amount" binding:"required"`
		Action string  `json:"action" binding:"required"`
		Reason string  `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	wallet, err := h.wallets.AdminAdjustWallet(c.Request.Context(), c.GetInt64("user_id"), "", req.UserID, req.Amount, req.Action, req.Reason)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Cüzdan işlemi başarısız")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cüzdan işlemi tamamlandı", "wallet": wallet})
}

// TreeMove bir üyeyi alt ağacıyla birlikte taşır (admin, denetim loglu).
func (h *AdminHandler) TreeMove(c *gin.Context) {
	var req struct {
		UserID      int64  `json:"user_id" binding:"required"`
		NewParentID int64  `json:"new_parent_id" binding:"required"`
		Position    string `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.tree.MoveUserInTree(c.Request.Context(), c.GetInt64("user_id"), "", req.UserID, req.NewParentID, req.Position); err != nil {
		log.WithError(err).Error("Ağaç taşıma başarısız")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Üye taşındı"})
}

// ListAuditLogs denetim kayıtlarını sayfalı döndürür (admin).
func (h *AdminHandler) ListAuditLogs(c *gin.Context) {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz limit değeri"})
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz offset değeri"})
		return
	}
	logs, total, err := h.audit.List(c.Request.Context(), limit, offset, c.Query("action"))
	if err != nil {
		log.WithError(err).Error("Denetim kayıtları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Denetim kayıtları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "limit": limit, "offset": offset})
}

// ListCorrectionLogs puan/bakiye düzeltme loglarını döndürür (admin).
func (h *AdminHandler) ListCorrectionLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	logs, total, err := h.audit.ListCorrections(c.Request.Context(), limit, offset)
	if err != nil {
		log.WithError(err).Error("Düzeltme logları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Düzeltme logları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "limit": limit, "offset": offset})
}

// BinaryBalance sol/sağ bacak dengesini döndürür (admin).
func (h *AdminHandler) BinaryBalance(c *gin.Context) {
	balance, err := h.stats.BinaryBalance(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Binary denge okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Binary denge okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"balance": balance})
}

// TopEarners en çok kazananları döndürür (admin).
func (h *AdminHandler) TopEarners(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	earners, err := h.stats.TopEarners(c.Request.Context(), limit)
	if err != nil {
		log.WithError(err).Error("En çok kazananlar okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "En çok kazananlar okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"earners": earners})
}

// SimulateBonus bonus dağıtım tahmini döndürür (admin).
func (h *AdminHandler) SimulateBonus(c *gin.Context) {
	var req struct {
		MemberCount int64   `json:"member_count" binding:"required"`
		AveragePV   float64 `json:"average_pv" binding:"required"`
		Period      string  `json:"period"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	result, err := h.stats.SimulateBonus(c.Request.Context(), req.MemberCount, req.AveragePV, req.Period)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"result": result})
}

// GetFlashout flashout/cap kurallarını döndürür (admin).
func (h *AdminHandler) GetFlashout(c *gin.Context) {
	rules, err := h.stats.Flashout(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Flashout kuralları okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Flashout kuralları okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"flashout": rules})
}

// SetFlashout flashout/cap kurallarını kaydeder (admin, denetim loglu).
func (h *AdminHandler) SetFlashout(c *gin.Context) {
	var req struct {
		DailyLimit  float64 `json:"daily_limit"`
		WeeklyLimit float64 `json:"weekly_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.stats.SetFlashout(c.Request.Context(), req.DailyLimit, req.WeeklyLimit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.audit.Log(c.Request.Context(), c.GetInt64("user_id"), "flashout_update", "settings", nil, "",
		map[string]any{"daily_limit": req.DailyLimit, "weekly_limit": req.WeeklyLimit})
	c.JSON(http.StatusOK, gin.H{"message": "Flashout kuralları güncellendi"})
}

// FraudScan multi-hesap taraması yapar (admin).
func (h *AdminHandler) FraudScan(c *gin.Context) {
	var req struct {
		Field string `json:"field" binding:"required"`
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	matches, err := h.stats.FraudScan(c.Request.Context(), req.Field, req.Value)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"matches": matches})
}

// FraudMatches önceden bulunan eşleşme sonuçlarını döndürür (admin).
// Şu an canlı tarama sonuçları saklanmadığından boş liste döner; panel
// istediği anda FraudScan ile tarama yapar.
func (h *AdminHandler) FraudMatches(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"matches": []any{}})
}

// FlashoutLogs flashout/cap ihlal kayıtlarını döndürür (admin).
func (h *AdminHandler) FlashoutLogs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	logs, total, err := h.stats.FlashoutLogs(c.Request.Context(), limit, offset)
	if err != nil {
		log.WithError(err).Error("Flashout logları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Flashout logları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "limit": limit, "offset": offset})
}

// Revenue dönem bazlı ciro serisini döndürür (admin).
func (h *AdminHandler) Revenue(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	points, err := h.stats.RevenueByPeriod(c.Request.Context(), c.Query("period"), limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"points": points})
}

// AdjustPVAndCV üyenin birikmiş PV/CV'sini manuel düzeltir (super admin).
func (h *AdminHandler) AdjustPVAndCV(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	var req struct {
		DeltaPV int64  `json:"delta_pv"`
		DeltaCV int64  `json:"delta_cv"`
		Reason  string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if req.DeltaPV == 0 && req.DeltaCV == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "En az bir düzeltme değeri (delta_pv veya delta_cv) verilmelidir"})
		return
	}
	if err := h.users.AdjustPVAndCV(c.Request.Context(), c.GetInt64("user_id"), "", userID, req.DeltaPV, req.DeltaCV, req.Reason); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("PV/CV düzeltilemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PV/CV düzeltmesi uygulandı"})
}

// RunBonusJob toplu binary eşleşme geçişini asenkron başlatır (admin).
// Yanıt anında döner; ilerleme GET /admin/jobs/:id ile izlenir.
func (h *AdminHandler) RunBonusJob(c *gin.Context) {
	var req struct {
		Period string `json:"period"`
	}
	_ = c.ShouldBindJSON(&req) // period şimdilik bilgi amaçlı

	job, err := h.jobs.Create(c.Request.Context(), "binary_match")
	if err != nil {
		log.WithError(err).Error("Bonus işi oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bonus işi oluşturulamadı"})
		return
	}

	go h.jobs.RunBinaryMatchPass(c.Request.Context(), job.ID)

	c.JSON(http.StatusAccepted, gin.H{"job_id": job.ID, "status": "queued", "message": "Toplu binary eşleşme başlatıldı"})
}

// GetJob asenkron iş kaydını döndürür (admin).
func (h *AdminHandler) GetJob(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz iş ID"})
		return
	}
	job, err := h.jobs.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrJobNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		log.WithError(err).Error("İş kaydı okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "İş kaydı okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"job": job})
}

// ListJobs son asenkron iş kayıtlarını döndürür (admin).
func (h *AdminHandler) ListJobs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	jobs, err := h.jobs.ListRecent(c.Request.Context(), limit)
	if err != nil {
		log.WithError(err).Error("İş kayıtları listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "İş kayıtları listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"jobs": jobs})
}

// CommissionSeries dönem bazlı ödenmiş komisyon serisini döndürür (admin).
func (h *AdminHandler) CommissionSeries(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	points, err := h.stats.CommissionSeries(c.Request.Context(), c.Query("period"), limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"points": points})
}

// RankDistribution kariyer dağılımını döndürür (admin).
func (h *AdminHandler) RankDistribution(c *gin.Context) {
	dist, err := h.stats.RankDistribution(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Kariyer dağılımı okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyer dağılımı okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"distribution": dist})
}

// RecomputeCareers tüm üyelerin kariyerlerini (rütbelerini) yeniden hesaplar (admin).
// Kariyer motorunu manuel tetiklemek için kullanılır; aylık kapanışta otomatik çalışır.
func (h *AdminHandler) RecomputeCareers(c *gin.Context) {
	tx, err := database.GetDB().Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "İşlem başlatılamadı"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	processed, err := services.RecomputeAllCareers(c.Request.Context(), tx)
	if err != nil {
		log.WithError(err).Error("Kariyerler yeniden hesaplanamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyerler yeniden hesaplanamadı"})
		return
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyer hesaplama commit edilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kariyerler yeniden hesaplandı", "processed": processed})
}

// RespawnUser üyeyi askıya alıp yeni sponsorla sıfırdan üyelik açar (admin).
func (h *AdminHandler) RespawnUser(c *gin.Context) {
	var req struct {
		UserID       int64 `json:"user_id" binding:"required"`
		NewSponsorID int64 `json:"new_sponsor_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	tx, err := database.GetDB().Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	newUser, err := services.RespawnUser(c.Request.Context(), tx, req.UserID, req.NewSponsorID, c.GetInt64("user_id"), "")
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRespawnNotEligible):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrUserNotFound), errors.Is(err, services.ErrSponsorNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Yeniden üyelik başarısız")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Yeniden üyelik tamamlandı", "user": newUser})
}

// ChangeSponsor üyenin sponsorunu değiştirir (admin, denetim loglu).
func (h *AdminHandler) ChangeSponsor(c *gin.Context) {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	var req struct {
		NewSponsorID int64 `json:"new_sponsor_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}

	tx, err := database.GetDB().Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	if err := services.ChangeSponsor(c.Request.Context(), tx, userID, req.NewSponsorID, c.GetInt64("user_id"), ""); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound), errors.Is(err, services.ErrSponsorNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrSponsorCycle), errors.Is(err, services.ErrInactiveUser):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Sponsor değiştirilemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bir sorun oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sponsor değiştirildi"})
}

// TopProducts en çok satan ürünleri döndürür (admin).
func (h *AdminHandler) TopProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	items, err := h.stats.TopProducts(c.Request.Context(), limit)
	if err != nil {
		log.WithError(err).Error("En çok satan ürünler okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "En çok satan ürünler okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"products": items})
}

// FraudDuplicates çoklu hesap şüphesi gruplarını döndürür (admin).
func (h *AdminHandler) FraudDuplicates(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "8"))
	groups, err := h.stats.FraudDuplicates(c.Request.Context(), limit)
	if err != nil {
		log.WithError(err).Error("Çoklu hesap grupları okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Çoklu hesap grupları okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"groups": groups})
}

// UpdateUserStatus üyeyi dondurur veya aktifleştirir (admin, denetim loglu).
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	adminID := c.GetInt64("user_id")
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	var req struct {
		IsActive bool   `json:"is_active"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.users.UpdateUserStatus(c.Request.Context(), userID, req.IsActive); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Üye durumu güncellenemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	action := "user_freeze"
	if req.IsActive {
		action = "user_activate"
	}
	if err := h.audit.Log(c.Request.Context(), adminID, action, "user", &userID, req.Reason, nil); err != nil {
		log.WithError(err).Warn("Denetim kaydı yazılamadı (üye durumu)")
	}
	c.JSON(http.StatusOK, gin.H{"message": "Üye durumu güncellendi"})
}

// FinancialSummary sistem bilançosu ve cross-check özetini döndürür (admin).
func (h *AdminHandler) FinancialSummary(c *gin.Context) {
	summary, err := h.stats.FinancialSummary(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Finansal özet okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Finansal özet okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// TransferWallet iki üye arasında bakiye transferi yapar (admin, denetim loglu).
func (h *AdminHandler) TransferWallet(c *gin.Context) {
	adminID := c.GetInt64("user_id")
	var req struct {
		FromUserID int64   `json:"from_user_id" binding:"required"`
		ToUserID   int64   `json:"to_user_id" binding:"required"`
		Amount     float64 `json:"amount" binding:"required,gt=0"`
		Reason     string  `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.wallets.TransferWallet(c.Request.Context(), adminID, "", req.FromUserID, req.ToUserID, req.Amount, req.Reason); err != nil {
		switch {
		case errors.Is(err, services.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrInsufficientBalance):
			c.JSON(http.StatusConflict, gin.H{"error": "Gönderenin yeterli bakiyesi yok"})
		default:
			log.WithError(err).Error("Bakiye transferi başarısız")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Transfer tamamlandı"})
}

// ListTransfers iç transfer hareketlerini döndürür (admin).
func (h *AdminHandler) ListTransfers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	items, total, err := h.wallets.ListTransfers(c.Request.Context(), limit, offset)
	if err != nil {
		log.WithError(err).Error("Transferler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transferler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"transfers": items, "total": total})
}

// UpdateUserRole üyenin rolünü değiştirir (süper admin, denetim loglu).
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	adminID := c.GetInt64("user_id")
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz üye ID"})
		return
	}
	var req struct {
		Role   string `json:"role" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek gövdesi"})
		return
	}
	if err := h.users.UpdateUserRole(c.Request.Context(), userID, req.Role); err != nil {
		switch {
		case errors.Is(err, services.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			log.WithError(err).Error("Üye rolü güncellenemedi")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}
	if err := h.audit.Log(c.Request.Context(), adminID, "user_role_change", "user", &userID, req.Reason, nil); err != nil {
		log.WithError(err).Warn("Denetim kaydı yazılamadı (rol değişimi)")
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rol güncellendi"})
}
