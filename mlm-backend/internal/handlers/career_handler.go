package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
)

// CareerHandler kariyer (rütbe) dağılımı ve aylık kariyer kazanımlarını sunar.
type CareerHandler struct{}

// NewCareerHandler yeni bir CareerHandler döndürür.
func NewCareerHandler() *CareerHandler { return &CareerHandler{} }

// rangeFromQuery start/end (YYYY-AA-GG) parametrelerini çözer; bitiş günü dahildir.
// Geriye dönük uyumluluk: start/end yoksa month=YYYY-MM kullanılır.
func rangeFromQuery(c *gin.Context) (time.Time, time.Time, bool) {
	s, e := c.Query("start"), c.Query("end")
	if s != "" || e != "" {
		st, err1 := time.Parse("2006-01-02", s)
		en, err2 := time.Parse("2006-01-02", e)
		if err1 != nil || err2 != nil || en.Before(st) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz tarih aralığı (YYYY-AA-GG)"})
			return time.Time{}, time.Time{}, false
		}
		return st, en.AddDate(0, 0, 1), true
	}
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))
	t, err := time.Parse("2006-01", month)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz ay (YYYY-MM)"})
		return time.Time{}, time.Time{}, false
	}
	st := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.Local)
	return st, st.AddDate(0, 1, 0), true
}

type careerMember struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	MemberCode string `json:"member_code"`
}

type careerRank struct {
	ID      int            `json:"id"`
	Name    string         `json:"name"`
	Count   int            `json:"count"`
	Members []careerMember `json:"members"`
}

// Distribution GET /api/admin/careers
// Mevcut kariyer dağılımı: Girişimci (rütbesiz) + tüm rütbeler; üye isim listeleriyle.
func (h *CareerHandler) Distribution(c *gin.Context) {
	ctx := c.Request.Context()
	db := database.GetDB()

	ranks := []careerRank{{ID: 0, Name: "Girişimci", Members: []careerMember{}}}
	idx := map[int]int{}

	rows, err := db.Query(ctx, `SELECT id, name FROM ranks ORDER BY id`)
	if err != nil {
		log.WithError(err).Error("Kariyer listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyer dağılımı alınamadı"})
		return
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			continue
		}
		ranks = append(ranks, careerRank{ID: id, Name: name, Members: []careerMember{}})
		idx[id] = len(ranks) - 1
	}

	urows, err := db.Query(ctx, `
		SELECT u.id, u.name, u.member_code, COALESCE(u.current_rank_id, 0)
		FROM users u
		WHERE u.role IN ('user','customer') AND u.is_active = true
		ORDER BY u.name`)
	if err != nil {
		log.WithError(err).Error("Kariyer üyeleri okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kariyer üyeleri alınamadı"})
		return
	}
	defer urows.Close()
	for urows.Next() {
		var id int64
		var name, code string
		var rankID int
		if err := urows.Scan(&id, &name, &code, &rankID); err != nil {
			continue
		}
		i := 0
		if rankID != 0 {
			j, ok := idx[rankID]
			if !ok {
				continue
			}
			i = j
		}
		ranks[i].Members = append(ranks[i].Members, careerMember{ID: id, Name: name, MemberCode: code})
		ranks[i].Count++
	}

	c.JSON(http.StatusOK, gin.H{"ranks": ranks})
}

type monthlyUser struct {
	careerMember
	AchievedAt time.Time `json:"achieved_at"`
}

type monthlyGroup struct {
	RankID   int           `json:"rank_id"`
	RankName string        `json:"rank_name"`
	Users    []monthlyUser `json:"users"`
}

// Monthly GET /api/admin/careers/monthly?start=YYYY-MM-DD&end=YYYY-MM-DD
// Seçilen tarih aralığında kariyer kazanan üyeleri rütbe bazında gruplar.
func (h *CareerHandler) Monthly(c *gin.Context) {
	start, end, ok := rangeFromQuery(c)
	if !ok {
		return
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT rp.rank_id, r.name, u.id, u.name, u.member_code, rp.achieved_at
		FROM rank_progress rp
		JOIN users u ON u.id = rp.user_id
		JOIN ranks r ON r.id = rp.rank_id
		WHERE rp.achieved_at >= $1 AND rp.achieved_at < $2
		ORDER BY rp.rank_id, rp.achieved_at`, start, end)
	if err != nil {
		log.WithError(err).Error("Aylık kariyer kayıtları okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Aylık kayıtlar alınamadı"})
		return
	}
	defer rows.Close()

	groups := make([]monthlyGroup, 0)
	idx := map[int]int{}
	for rows.Next() {
		var rankID int
		var rankName string
		var id int64
		var name, code string
		var achieved time.Time
		if err := rows.Scan(&rankID, &rankName, &id, &name, &code, &achieved); err != nil {
			continue
		}
		i, ok := idx[rankID]
		if !ok {
			groups = append(groups, monthlyGroup{RankID: rankID, RankName: rankName, Users: []monthlyUser{}})
			i = len(groups) - 1
			idx[rankID] = i
		}
		groups[i].Users = append(groups[i].Users, monthlyUser{
			careerMember: careerMember{ID: id, Name: name, MemberCode: code},
			AchievedAt:   achieved,
		})
	}

	c.JSON(http.StatusOK, gin.H{"groups": groups})
}

type earningUser struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	MemberCode string  `json:"member_code"`
	Total      float64 `json:"total"`
}

// Earnings GET /api/admin/careers/earnings?start=YYYY-MM-DD&end=YYYY-MM-DD&order=top|bottom&limit=100
// Seçilen tarih aralığında ödenmiş komisyonlara göre en çok / en az kazanan üyeler.
func (h *CareerHandler) Earnings(c *gin.Context) {
	start, end, ok := rangeFromQuery(c)
	if !ok {
		return
	}
	order := c.DefaultQuery("order", "top")
	dir := "DESC"
	if order == "bottom" {
		dir = "ASC"
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if limit <= 0 || limit > 10000 {
		limit = 100
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT c.user_id, u.name, u.member_code, COALESCE(SUM(c.amount), 0) AS total
		FROM commissions c
		JOIN users u ON u.id = c.user_id
		WHERE c.status = 'paid' AND c.paid_at >= $1 AND c.paid_at < $2
		GROUP BY c.user_id, u.name, u.member_code
		HAVING COALESCE(SUM(c.amount), 0) > 0
		ORDER BY total `+dir+`
		LIMIT $3`, start, end, limit)
	if err != nil {
		log.WithError(err).Error("Kazanç listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kazanç listesi alınamadı"})
		return
	}
	defer rows.Close()

	users := make([]earningUser, 0)
	for rows.Next() {
		var u earningUser
		if err := rows.Scan(&u.ID, &u.Name, &u.MemberCode, &u.Total); err != nil {
			continue
		}
		users = append(users, u)
	}

	c.JSON(http.StatusOK, gin.H{"order": order, "users": users})
}

type pvUser struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	MemberCode string  `json:"member_code"`
	TotalPV    float64 `json:"total_pv"`
}

// PVTop GET /api/admin/careers/pv-top?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=100
// Seçilen tarih aralığında en çok PV biriktiren üyeler; yalnızca o aralığın
// binary_transactions hareketlerine göre (birikmiş toplamlar hariç).
func (h *CareerHandler) PVTop(c *gin.Context) {
	start, end, ok := rangeFromQuery(c)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if limit <= 0 || limit > 10000 {
		limit = 100
	}
	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT bt.user_id, u.name, u.member_code,
		       COALESCE(SUM(CASE WHEN bt.transaction_type = 'add' THEN bt.pv
		                         WHEN bt.transaction_type = 'deduct' THEN -bt.pv
		                         ELSE 0 END), 0) AS total
		FROM binary_transactions bt
		JOIN users u ON u.id = bt.user_id
		WHERE bt.created_at >= $1 AND bt.created_at < $2
		GROUP BY bt.user_id, u.name, u.member_code
		HAVING COALESCE(SUM(CASE WHEN bt.transaction_type = 'add' THEN bt.pv
		                         WHEN bt.transaction_type = 'deduct' THEN -bt.pv
		                         ELSE 0 END), 0) > 0
		ORDER BY total DESC
		LIMIT $3`, start, end, limit)
	if err != nil {
		log.WithError(err).Error("PV listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "PV listesi alınamadı"})
		return
	}
	defer rows.Close()

	users := make([]pvUser, 0)
	for rows.Next() {
		var u pvUser
		if err := rows.Scan(&u.ID, &u.Name, &u.MemberCode, &u.TotalPV); err != nil {
			continue
		}
		users = append(users, u)
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

type cvUser struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	MemberCode string  `json:"member_code"`
	TotalCV    float64 `json:"total_cv"`
}

// CVTop GET /api/admin/careers/cv-top?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=100
// Seçilen tarih aralığında en çok CV (komisyon hacmi) biriktiren üyeler;
// yalnızca o aralığın binary_transactions hareketlerine göre (birikmiş toplamlar hariç).
func (h *CareerHandler) CVTop(c *gin.Context) {
	start, end, ok := rangeFromQuery(c)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if limit <= 0 || limit > 10000 {
		limit = 100
	}

	rows, err := database.GetDB().Query(c.Request.Context(), `
		SELECT bt.user_id, u.name, u.member_code,
		       COALESCE(SUM(CASE WHEN bt.transaction_type = 'add' THEN bt.cv
		                         WHEN bt.transaction_type = 'deduct' THEN -bt.cv
		                         ELSE 0 END), 0) AS total
		FROM binary_transactions bt
		JOIN users u ON u.id = bt.user_id
		WHERE bt.created_at >= $1 AND bt.created_at < $2
		GROUP BY bt.user_id, u.name, u.member_code
		HAVING COALESCE(SUM(CASE WHEN bt.transaction_type = 'add' THEN bt.cv
		                         WHEN bt.transaction_type = 'deduct' THEN -bt.cv
		                         ELSE 0 END), 0) > 0
		ORDER BY total DESC
		LIMIT $3`, start, end, limit)
	if err != nil {
		log.WithError(err).Error("CV listesi okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "CV listesi alınamadı"})
		return
	}
	defer rows.Close()

	users := make([]cvUser, 0)
	for rows.Next() {
		var u cvUser
		if err := rows.Scan(&u.ID, &u.Name, &u.MemberCode, &u.TotalCV); err != nil {
			continue
		}
		users = append(users, u)
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}
