package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// TreeHandler binary ağaç görünümü endpoint'lerini yönetir.
type TreeHandler struct {
	dash *services.DashboardService
}

// NewTreeHandler yeni bir TreeHandler örneği döndürür.
func NewTreeHandler(dash *services.DashboardService) *TreeHandler {
	return &TreeHandler{dash: dash}
}

// Get belirtilen kullanıcının binary alt ağacını döndürür (JWT korumalı).
// Sorgu parametreleri: ?user_id=1&depth=3 (user_id yoksa JWT kullanıcısı; depth varsayılan 3, max 5).
func (h *TreeHandler) Get(c *gin.Context) {
	userID := c.GetInt64("user_id")

	if q := c.Query("user_id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz user_id değeri"})
			return
		}
		userID = id
	}

	depth := 3
	if q := c.Query("depth"); q != "" {
		d, err := strconv.Atoi(q)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz depth değeri"})
			return
		}
		depth = d
	}

	// month "YYYY-MM" biçiminde opsiyonel as-of filtresi (kayıt ayına göre ağaç).
	period := c.Query("month")

	tree, err := h.dash.GetTree(c.Request.Context(), userID, depth, period)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
			return
		}
		log.WithError(err).Error("Ağaç verisi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ağaç verisi getirilemedi"})
		return
	}

	minMonth, _ := h.dash.MinRegistrationMonth(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"tree": tree, "min_month": minMonth})
}

// Level tek bir düğümün kendi verisini ve iki çocuğunu döndürür (lazy load).
//
//	GET /api/tree/level?id=<user_id>&month=YYYY-MM
//
// id verilmezse JWT kullanıcısı kullanılır. Yetki: kendi düğümü, kendi alt
// hattındaki bir düğüm veya yönetici. Böylece arayüz ağacı düğüm düğüm büyütür;
// tüm alt ağaç asla tek istekte çekilmez (milyonlarca üye için ölçeklenebilir).
func (h *TreeHandler) Level(c *gin.Context) {
	requesterID := c.GetInt64("user_id")
	rol, _ := c.Get("user_role")
	rolStr, _ := rol.(string)
	yonetici := rolStr == "admin" || rolStr == "super_admin"

	nodeID := requesterID
	if q := c.Query("id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz id değeri"})
			return
		}
		nodeID = id
	}

	if !yonetici {
		izinli, err := h.dash.IsInBinaryDownline(c.Request.Context(), requesterID, nodeID)
		if err != nil {
			log.WithError(err).Error("Ağaç yetkisi kontrol edilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Yetki kontrolü yapılamadı"})
			return
		}
		if !izinli {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bu düğümü görüntüleme yetkiniz yok"})
			return
		}
	}

	// month "YYYY-MM" → kesme anı: seçilen ayın bir sonraki ayının ilk günü
	cutoff := time.Time{}
	if period := c.Query("month"); period != "" {
		if t, err := time.Parse("2006-01", period); err == nil {
			cutoff = t.AddDate(0, 1, 0)
		}
	}

	node, err := h.dash.GetTreeLevel(c.Request.Context(), nodeID, cutoff)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
			return
		}
		log.WithError(err).Error("Düğüm verisi getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Düğüm verisi getirilemedi"})
		return
	}

	minMonth, _ := h.dash.MinRegistrationMonth(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"node": node, "min_month": minMonth})
}

// Search, kişinin kendi binary alt hattında üye kodu veya ada göre arama yapar
// ve bulunanların kökten hedefe giden yolunu döndürür. Arayüz bu yolu açarak
// hedefe iner (tüm ağaç yüklenmez).
//
//	GET /api/tree/search?q=Örnek%20Üye%2042
func (h *TreeHandler) Search(c *gin.Context) {
	requesterID := c.GetInt64("user_id")
	q := c.Query("q")

	adaylar, err := h.dash.SearchBinaryDownline(c.Request.Context(), requesterID, q, 5)
	if err != nil {
		log.WithError(err).Error("Ağaç araması başarısız")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Arama yapılamadı"})
		return
	}

	type aramaSonucu struct {
		Node models.TreeNode `json:"node"`
		Path []int64         `json:"path"`
	}
	sonuclar := make([]aramaSonucu, 0, len(adaylar))
	for _, n := range adaylar {
		yol, err := h.dash.PathToAncestor(c.Request.Context(), requesterID, n.UserID)
		if err != nil {
			continue
		}
		sonuclar = append(sonuclar, aramaSonucu{Node: n, Path: yol})
	}

	c.JSON(http.StatusOK, gin.H{"results": sonuclar})
}

// ─────────────────────────────────────────────────────────────────────────────
// Pinleme (sabitleme)
// ─────────────────────────────────────────────────────────────────────────────

// Pins kullanıcının sabitlediği üyeleri listeler.
//
//	GET /api/tree/pins
func (h *TreeHandler) Pins(c *gin.Context) {
	ownerID := c.GetInt64("user_id")
	liste, err := h.dash.ListPins(c.Request.Context(), ownerID)
	if err != nil {
		log.WithError(err).Error("Sabitlenenler getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sabitlenenler getirilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"pins": liste})
}

// PinAdd bir üyeyi sabitler.
//
//	POST /api/tree/pins  {"user_id": 90019}
func (h *TreeHandler) PinAdd(c *gin.Context) {
	ownerID := c.GetInt64("user_id")
	var govde struct {
		UserID int64 `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&govde); err != nil || govde.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek"})
		return
	}

	if err := h.dash.AddPin(c.Request.Context(), ownerID, govde.UserID); err != nil {
		if errors.Is(err, services.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Yalnızca kendi ekibinizdeki üyeleri sabitleyebilirsiniz"})
			return
		}
		log.WithError(err).Error("Sabitleme yapılamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sabitleme yapılamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// PinRemove sabitlemeyi kaldırır.
//
//	DELETE /api/tree/pins/:id
func (h *TreeHandler) PinRemove(c *gin.Context) {
	ownerID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz id"})
		return
	}
	if err := h.dash.RemovePin(c.Request.Context(), ownerID, id); err != nil {
		log.WithError(err).Error("Sabitleme kaldırılamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sabitleme kaldırılamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Points bir üyenin seçilen aydaki puan dağılımını (sipariş bazında sol/sağ
// PV-CV) ve toplamlarını döndürür.
//
//	GET /api/tree/points?id=<user_id>&month=YYYY-MM
func (h *TreeHandler) Points(c *gin.Context) {
	requesterID := c.GetInt64("user_id")
	rol, _ := c.Get("user_role")
	rolStr, _ := rol.(string)
	yonetici := rolStr == "admin" || rolStr == "super_admin"

	nodeID := requesterID
	if q := c.Query("id"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz id"})
			return
		}
		nodeID = id
	}

	if !yonetici {
		izinli, err := h.dash.IsInBinaryDownline(c.Request.Context(), requesterID, nodeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Yetki kontrolü yapılamadı"})
			return
		}
		if !izinli {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bu üyenin puanlarını görüntüleme yetkiniz yok"})
			return
		}
	}

	liste, toplam, err := h.dash.PointDistribution(c.Request.Context(), nodeID, c.Query("month"))
	if err != nil {
		log.WithError(err).Error("Puan dağılımı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Puan dağılımı getirilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"rows": liste, "totals": toplam})
}

// Downline — kökün binary alt hattını DÜZ LİSTE hâlinde döndürür (Data Grid).
//
//	GET /api/tree/downline?kok=<id>&bacak=L|R&durum=aktif|pasif&q=&sirala=ad|pv|cv|tarih|seviye&limit=&offset=
//
// NEDEN: "Sol bacağımda bu hafta aktif olmayanlar kim?" gibi sorular ağaç
// şemasında tek tek gezerek cevaplanamaz. Bu uç, alt hattı filtrelenebilir,
// sıralanabilir ve SAYFALANMIŞ olarak verir; tarayıcı yalnız görünen satırları
// çizer (sanal kaydırma), yüz binlerce üye sorun olmaz.
//
// Yetki: `kok` verilmezse oturumdaki kullanıcı; verilirse kendi binary alt
// hattında olmalı (yönetici hariç).
func (h *TreeHandler) Downline(c *gin.Context) {
	requesterID := c.GetInt64("user_id")
	rol, _ := c.Get("user_role")
	rolStr, _ := rol.(string)
	yonetici := rolStr == "admin" || rolStr == "super_admin"

	kokID := requesterID
	if q := c.Query("kok"); q != "" {
		id, err := strconv.ParseInt(q, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kok değeri"})
			return
		}
		kokID = id
	}

	if !yonetici && kokID != requesterID {
		izinli, err := h.dash.IsInBinaryDownline(c.Request.Context(), requesterID, kokID)
		if err != nil {
			log.WithError(err).Error("Alt hat yetkisi kontrol edilemedi")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Yetki kontrolü yapılamadı"})
			return
		}
		if !izinli {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bu üyenin alt hattını görüntüleme yetkiniz yok"})
			return
		}
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	f := services.DownlineFiltre{
		Bacak:    c.Query("bacak"),
		Durum:    c.Query("durum"),
		Arama:    c.Query("q"),
		Siralama: c.DefaultQuery("sirala", "ad"),
		Limit:    limit,
		Offset:   offset,
	}

	liste, toplam, err := h.dash.ListBinaryDownline(c.Request.Context(), kokID, f)
	if err != nil {
		log.WithError(err).Error("Alt hat listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Alt hat listelenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":  liste,
		"total":  toplam,
		"limit":  f.Limit,
		"offset": f.Offset,
		"kok":    kokID,
	})
}
