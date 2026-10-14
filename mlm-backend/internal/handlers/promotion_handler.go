package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
)

// ─────────────────────────────────────────────────────────────────────
// KAMPANYA VE PROMOSYONLAR
// type: kampanya | promosyon · starts_at / ends_at: başlangıç-bitiş tarihi
// personal_pv_quota: kişisel alışveriş PV kotası
// short_leg_target: kısa kol (zayıf kol) hedefi
// rank_rules: kariyer bazlı kurallar (kariyere göre zorlaştırma)
// ─────────────────────────────────────────────────────────────────────

// RankRule — kampanya/promosyonun kariyer (rütbe) bazlı kuralı.
type RankRule struct {
	RankID          int     `json:"rank_id"`
	ShortLegTarget  float64 `json:"short_leg_target"`
	PersonalPVQuota float64 `json:"personal_pv_quota"`
}

// PromotionInput — oluşturma / güncelleme girdisi.
type PromotionInput struct {
	Type            string     `json:"type"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	PeriodMonths    int        `json:"period_months"`
	StartsAt        string     `json:"starts_at"`
	EndsAt          string     `json:"ends_at"`
	PersonalPVQuota float64    `json:"personal_pv_quota"`
	ShortLegTarget  float64    `json:"short_leg_target"`
	RankRules       []RankRule `json:"rank_rules"`
	IsActive        *bool      `json:"is_active,omitempty"`
}

// Promotion — veritabanı satırı.
type Promotion struct {
	ID              int64      `json:"id"`
	Type            string     `json:"type"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	PeriodMonths    int        `json:"period_months"`
	StartsAt        string     `json:"starts_at"`
	EndsAt          string     `json:"ends_at"`
	PersonalPVQuota float64    `json:"personal_pv_quota"`
	ShortLegTarget  float64    `json:"short_leg_target"`
	RankRules       []RankRule `json:"rank_rules"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       string     `json:"created_at"`
}

// PromotionMember — bir kampanyaya göre üye uygunluk satırı.
type PromotionMember struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	RankID     int64   `json:"rank_id"`
	RankName   string  `json:"rank_name"`
	LeftPV     float64 `json:"left_pv"`
	RightPV    float64 `json:"right_pv"`
	ShortLeg   float64 `json:"short_leg"`
	PersonalPV float64 `json:"personal_pv"`
	Target     float64 `json:"target"`
	Qualified  bool    `json:"qualified"`
}

func validPromotionType(t string) bool { return t == "kampanya" || t == "promosyon" }
func validPeriod(p int) bool           { return p >= 1 && p <= 360 }

// parsePromoDate — tarih (± saat) metnini çözer; boş/geçersizse false döner.
// Kabul edilen biçimler: 2006-01-02 · 2006-01-02T15:04 · 2006-01-02 15:04 · saniyeli varyantlar.
func parsePromoDate(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// monthsSpan — iki tarih arası ay sayısı (dahil), 1..360 aralığına sıkıştırılır.
func monthsSpan(start, end time.Time) int {
	m := (end.Year()-start.Year())*12 + int(end.Month()) - int(start.Month()) + 1
	if m < 1 {
		m = 1
	}
	if m > 360 {
		m = 360
	}
	return m
}

// resolvePromotionDates — girdi tarihlerini doğrular ve süreyi (ay) hesaplar.
// Dönüş: startArg, endArg (nil olabilir) ve hata mesajı ("" = sorun yok).
func resolvePromotionDates(in *PromotionInput) (any, any, string) {
	startT, hasStart := parsePromoDate(in.StartsAt)
	endT, hasEnd := parsePromoDate(in.EndsAt)
	if hasStart && hasEnd {
		if endT.Before(startT) {
			return nil, nil, "Bitiş tarihi başlangıçtan önce olamaz"
		}
		in.PeriodMonths = monthsSpan(startT, endT)
	} else if !validPeriod(in.PeriodMonths) {
		return nil, nil, "Zaman dilimi 1 ile 360 ay arasında olmalıdır"
	}
	var startArg, endArg any
	if hasStart {
		startArg = startT
	}
	if hasEnd {
		endArg = endT
	}
	return startArg, endArg, ""
}

func decodeRules(raw []byte) ([]RankRule, error) {
	rules := []RankRule{}
	if len(raw) == 0 {
		return rules, nil
	}
	if err := json.Unmarshal(raw, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// ListPromotions GET /admin/promotions — tüm kampanya ve promosyonlar.
func (h *AdminHandler) ListPromotions(c *gin.Context) {
	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT id, type, name, COALESCE(description, ''), period_months,
		       COALESCE(to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI'), ''),
		       COALESCE(to_char(ends_at, 'YYYY-MM-DD"T"HH24:MI'), ''),
		       personal_pv_quota, short_leg_target, rank_rules, is_active,
		       to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		FROM promotions
		ORDER BY created_at DESC`)
	if err != nil {
		log.WithError(err).Error("Kampanyalar okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kampanyalar alınamadı"})
		return
	}
	defer rows.Close()

	list := []Promotion{}
	for rows.Next() {
		var p Promotion
		var rules []byte
		if err := rows.Scan(&p.ID, &p.Type, &p.Name, &p.Description, &p.PeriodMonths,
			&p.StartsAt, &p.EndsAt,
			&p.PersonalPVQuota, &p.ShortLegTarget, &rules, &p.IsActive, &p.CreatedAt); err != nil {
			log.WithError(err).Error("Kampanya satırı okunamadı")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kampanyalar okunurken hata oluştu"})
			return
		}
		if p.RankRules, err = decodeRules(rules); err != nil {
			p.RankRules = []RankRule{}
		}
		list = append(list, p)
	}
	c.JSON(http.StatusOK, gin.H{"promotions": list})
}

// CreatePromotion POST /admin/promotions
func (h *AdminHandler) CreatePromotion(c *gin.Context) {
	var in PromotionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz veri"})
		return
	}
	if !validPromotionType(in.Type) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tür kampanya veya promosyon olmalıdır"})
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Başlık zorunludur"})
		return
	}
	startArg, endArg, tarihErr := resolvePromotionDates(&in)
	if tarihErr != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": tarihErr})
		return
	}
	if in.RankRules == nil {
		in.RankRules = []RankRule{}
	}
	rulesJSON, _ := json.Marshal(in.RankRules)
	active := true
	if in.IsActive != nil {
		active = *in.IsActive
	}

	var id int64
	err := database.GetDB().QueryRow(c.Request.Context(), `
		INSERT INTO promotions (type, name, description, period_months, personal_pv_quota, short_leg_target, rank_rules, is_active, starts_at, ends_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`,
		in.Type, in.Name, in.Description, in.PeriodMonths, in.PersonalPVQuota, in.ShortLegTarget, rulesJSON, active, startArg, endArg).Scan(&id)
	if err != nil {
		log.WithError(err).Error("Kampanya oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kampanya oluşturulamadı"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// UpdatePromotion PUT /admin/promotions/:id
func (h *AdminHandler) UpdatePromotion(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kimlik"})
		return
	}
	var in PromotionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz veri"})
		return
	}
	if !validPromotionType(in.Type) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tür kampanya veya promosyon olmalıdır"})
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Başlık zorunludur"})
		return
	}
	startArg, endArg, tarihErr := resolvePromotionDates(&in)
	if tarihErr != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": tarihErr})
		return
	}
	if in.RankRules == nil {
		in.RankRules = []RankRule{}
	}
	rulesJSON, _ := json.Marshal(in.RankRules)

	ct, err := database.GetDB().Exec(c.Request.Context(), `
		UPDATE promotions
		SET type = $2, name = $3, description = $4, period_months = $5,
		    personal_pv_quota = $6, short_leg_target = $7, rank_rules = $8,
		    starts_at = $9, ends_at = $10, updated_at = now()
		WHERE id = $1`,
		id, in.Type, in.Name, in.Description, in.PeriodMonths, in.PersonalPVQuota, in.ShortLegTarget, rulesJSON, startArg, endArg)
	if err != nil {
		log.WithError(err).Error("Kampanya güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kampanya güncellenemedi"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kampanya bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// DeletePromotion DELETE /admin/promotions/:id
func (h *AdminHandler) DeletePromotion(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kimlik"})
		return
	}
	ct, err := database.GetDB().Exec(c.Request.Context(), `DELETE FROM promotions WHERE id = $1`, id)
	if err != nil {
		log.WithError(err).Error("Kampanya silinemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kampanya silinemedi"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kampanya bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// SetPromotionActive POST /admin/promotions/:id/active — aktif/pasif anahtarı.
func (h *AdminHandler) SetPromotionActive(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kimlik"})
		return
	}
	var body struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz veri"})
		return
	}
	ct, err := database.GetDB().Exec(c.Request.Context(),
		`UPDATE promotions SET is_active = $2, updated_at = now() WHERE id = $1`, id, body.IsActive)
	if err != nil {
		log.WithError(err).Error("Kampanya durumu güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Durum güncellenemedi"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kampanya bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// PromotionMembers GET /admin/promotions/:id/members — uygunluk listesi.
// Kısa kol (zayıf kol) = min(sol PV, sağ PV); hedef global ya da kariyer bazlı.
func (h *AdminHandler) PromotionMembers(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kimlik"})
		return
	}
	var target float64
	var rulesJSON []byte
	err = database.GetDB().QueryRow(c.Request.Context(),
		`SELECT short_leg_target, rank_rules FROM promotions WHERE id = $1`, id).Scan(&target, &rulesJSON)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kampanya bulunamadı"})
		return
	}
	rules, _ := decodeRules(rulesJSON)
	ruleByRank := map[int]float64{}
	for _, r := range rules {
		ruleByRank[r.RankID] = r.ShortLegTarget
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT u.id, COALESCE(u.name, ''), COALESCE(u.current_rank_id, 0), COALESCE(r.name, ''),
		       COALESCE(u.total_pv_left, 0), COALESCE(u.total_pv_right, 0),
		       COALESCE((SELECT SUM(o.total_pv) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled'), 0)
		FROM users u
		LEFT JOIN ranks r ON r.id = u.current_rank_id
		WHERE u.role IN ('user', 'admin') AND u.is_active
		ORDER BY LEAST(COALESCE(u.total_pv_left, 0), COALESCE(u.total_pv_right, 0)) DESC, u.id ASC`)
	if err != nil {
		log.WithError(err).Error("Uygunluk listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Uygunluk listesi alınamadı"})
		return
	}
	defer rows.Close()

	list := []PromotionMember{}
	for rows.Next() {
		var m PromotionMember
		if err := rows.Scan(&m.ID, &m.Name, &m.RankID, &m.RankName, &m.LeftPV, &m.RightPV, &m.PersonalPV); err != nil {
			log.WithError(err).Error("Uygunluk satırı okunamadı")
			continue
		}
		m.ShortLeg = m.LeftPV
		if m.RightPV < m.ShortLeg {
			m.ShortLeg = m.RightPV
		}
		m.Target = target
		if t, ok := ruleByRank[int(m.RankID)]; ok && t > 0 {
			m.Target = t
		}
		m.Qualified = m.Target > 0 && m.ShortLeg >= m.Target
		list = append(list, m)
	}
	c.JSON(http.StatusOK, gin.H{"members": list})
}
