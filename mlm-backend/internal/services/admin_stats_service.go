package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminStatsService yönetim paneli raporları (binary denge, en çok kazananlar,
// bonus simülasyonu, flashout kuralları, fraud taraması) için veri sağlar.
type AdminStatsService struct {
	db *pgxpool.Pool
}

// NewAdminStatsService yeni bir AdminStatsService örneği döndürür.
func NewAdminStatsService(db *pgxpool.Pool) *AdminStatsService {
	return &AdminStatsService{db: db}
}

// BinaryBalance sistem genelindeki sol/sağ bacak dengesini döndürür.
func (s *AdminStatsService) BinaryBalance(ctx context.Context) (map[string]any, error) {
	var leftPV, rightPV, leftCV, rightCV int64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(total_pv_left), 0), COALESCE(SUM(total_pv_right), 0),
		       COALESCE(SUM(total_cv_left), 0), COALESCE(SUM(total_cv_right), 0)
		FROM users`).Scan(&leftPV, &rightPV, &leftCV, &rightCV)
	if err != nil {
		return nil, fmt.Errorf("binary denge okunamadı: %w", err)
	}
	return map[string]any{
		"left_pv":  leftPV,
		"right_pv": rightPV,
		"left_cv":  leftCV,
		"right_cv": rightCV,
		// Makas: sağ - sol (pozitifse sağ bacak ağır)
		"imbalance_pv": rightPV - leftPV,
	}, nil
}

// TopEarner en çok kazanan üyelerden birini temsil eder.
type TopEarner struct {
	UserID       int64   `json:"user_id"`
	Name         string  `json:"name"`
	MemberCode   string  `json:"member_code"`
	TotalEarned  float64 `json:"total_earned"`
	RecentEarned float64 `json:"recent_earned"`
}

// TopEarners ödenmiş komisyonlara göre en çok kazanan üyeleri döndürür.
// recentEarned son 30 günlük kazançtır.
func (s *AdminStatsService) TopEarners(ctx context.Context, limit int) ([]TopEarner, error) {
	rows, err := s.db.Query(ctx, `
		SELECT c.user_id, u.name, u.member_code,
		       COALESCE(SUM(c.amount), 0) AS total,
		       COALESCE(SUM(c.amount) FILTER (WHERE c.paid_at >= NOW() - INTERVAL '30 days'), 0) AS recent
		FROM commissions c
		JOIN users u ON u.id = c.user_id
		WHERE c.status = 'paid'
		GROUP BY c.user_id, u.name, u.member_code
		ORDER BY total DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("en çok kazananlar listelenemedi: %w", err)
	}
	defer rows.Close()

	earners := make([]TopEarner, 0)
	for rows.Next() {
		var e TopEarner
		if err := rows.Scan(&e.UserID, &e.Name, &e.MemberCode, &e.TotalEarned, &e.RecentEarned); err != nil {
			return nil, fmt.Errorf("kazanan satırı okunamadı: %w", err)
		}
		earners = append(earners, e)
	}
	return earners, rows.Err()
}

// SimulateBonus basit bir binary bonus tahmini döndürür. Varsayımlar:
// ortalama binary oranı %10 ve eşleşen hacim = toplam hacim / 2.
// Gerçek dağıtım öncesi "şirket ne öder?" sorusuna kaba cevap verir.
func (s *AdminStatsService) SimulateBonus(ctx context.Context, memberCount int64, averagePV float64, period string) (map[string]any, error) {
	if memberCount <= 0 {
		return nil, fmt.Errorf("üye sayısı 0'dan büyük olmalıdır")
	}
	if averagePV < 0 {
		return nil, fmt.Errorf("ortalama PV negatif olamaz")
	}
	if period == "" {
		period = "daily"
	}
	totalVolume := float64(memberCount) * averagePV
	matchedVolume := totalVolume / 2
	estimatedBonus := matchedVolume * 0.10 // varsayılan %10 binary oranı

	return map[string]any{
		"period":             period,
		"member_count":       memberCount,
		"average_pv":         averagePV,
		"total_volume":       totalVolume,
		"matched_volume":     matchedVolume,
		"estimated_bonus":    round2(estimatedBonus),
		"assumed_binary_rate": 0.10,
		"note":               "Tahmini değerdir; gerçek dağıtım paket oranlarına ve flashout limitlerine bağlıdır.",
	}, nil
}

// Flashout flashout/cap kurallarını settings tablosundan döndürür
// (flashout_daily_limit, flashout_weekly_limit; 0 = limit yok).
func (s *AdminStatsService) Flashout(ctx context.Context) (map[string]any, error) {
	daily, err := s.settingFloat(ctx, "flashout_daily_limit")
	if err != nil {
		return nil, err
	}
	weekly, err := s.settingFloat(ctx, "flashout_weekly_limit")
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"daily_limit":  daily,
		"weekly_limit": weekly,
	}, nil
}

// SetFlashout flashout/cap kurallarını settings tablosuna yazar.
func (s *AdminStatsService) SetFlashout(ctx context.Context, daily, weekly float64) error {
	if daily < 0 || weekly < 0 {
		return fmt.Errorf("limitler negatif olamaz")
	}
	if _, err := s.db.Exec(ctx, `
		INSERT INTO settings (key, value, updated_at) VALUES
			('flashout_daily_limit', $1, NOW()),
			('flashout_weekly_limit', $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
		strconv.FormatFloat(daily, 'f', 2, 64), strconv.FormatFloat(weekly, 'f', 2, 64)); err != nil {
		return fmt.Errorf("flashout kuralları kaydedilemedi: %w", err)
	}
	return nil
}

func (s *AdminStatsService) settingFloat(ctx context.Context, key string) (float64, error) {
	var raw string
	err := s.db.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&raw)
	if err != nil {
		// Anahtar yoksa varsayılan 0 (limit yok)
		return 0, nil
	}
	v, convErr := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if convErr != nil {
		return 0, nil
	}
	return v, nil
}

// FlashoutLog flashout/cap ihlal kaydını temsil eder.
type FlashoutLog struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	UserName     string    `json:"user_name"`
	MemberCode   string    `json:"member_code"`
	Period       string    `json:"period"`
	LimitAmount  float64   `json:"limit_amount"`
	EarnedAmount float64   `json:"earned_amount"`
	CappedAmount float64   `json:"capped_amount"`
	CreatedAt    time.Time `json:"created_at"`
}

// FlashoutLogs flashout ihlal kayıtlarını sayfalı döndürür.
func (s *AdminStatsService) FlashoutLogs(ctx context.Context, limit, offset int) ([]FlashoutLog, int64, error) {
	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM flashout_logs`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("flashout logları sayılamadı: %w", err)
	}

	rows, err := s.db.Query(ctx, `
		SELECT f.id, f.user_id, u.name, u.member_code, f.period, f.limit_amount, f.earned_amount, f.capped_amount, f.created_at
		FROM flashout_logs f
		JOIN users u ON u.id = f.user_id
		ORDER BY f.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("flashout logları listelenemedi: %w", err)
	}
	defer rows.Close()

	logs := make([]FlashoutLog, 0)
	for rows.Next() {
		var l FlashoutLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.UserName, &l.MemberCode, &l.Period, &l.LimitAmount, &l.EarnedAmount, &l.CappedAmount, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("flashout satırı okunamadı: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}

// FraudMatch multi-hesap taramasında bulunan bir eşleşmeyi temsil eder.
type FraudMatch struct {
	UserID       int64  `json:"user_id"`
	Name         string `json:"name"`
	MemberCode   string `json:"member_code"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	MatchedField string `json:"matched_field"`
	MatchedValue string `json:"matched_value"`
	Count        int    `json:"count"`
	Risk         string `json:"risk"`
}

// FraudScan aynı TC/IBAN/telefon/e-posta ile açılmış mükerrer hesapları tarar.
// field: "tc" | "iban" | "phone" | "email".
func (s *AdminStatsService) FraudScan(ctx context.Context, field, value string) ([]FraudMatch, error) {
	field = strings.ToLower(strings.TrimSpace(field))
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, fmt.Errorf("tarama değeri boş olamaz")
	}

	var rows pgx.Rows
	var err error
	switch field {
	case "tc":
		rows, err = s.db.Query(ctx, `
			SELECT u.id, u.name, u.member_code, COALESCE(u.email, ''), COALESCE(u.phone, '')
			FROM users u
			WHERE u.profile->>'tc' = $1
			ORDER BY u.id`, value)
	case "iban":
		rows, err = s.db.Query(ctx, `
			SELECT u.id, u.name, u.member_code, COALESCE(u.email, ''), COALESCE(u.phone, '')
			FROM bank_accounts ba
			JOIN users u ON u.id = ba.user_id
			WHERE ba.iban = $1
			ORDER BY u.id`, strings.ToUpper(value))
	case "phone":
		rows, err = s.db.Query(ctx, `
			SELECT u.id, u.name, u.member_code, COALESCE(u.email, ''), COALESCE(u.phone, '')
			FROM users u WHERE u.phone = $1 ORDER BY u.id`, value)
	case "email":
		rows, err = s.db.Query(ctx, `
			SELECT u.id, u.name, u.member_code, COALESCE(u.email, ''), COALESCE(u.phone, '')
			FROM users u WHERE u.email = $1 ORDER BY u.id`, strings.ToLower(value))
	default:
		return nil, fmt.Errorf("geçersiz alan: 'tc', 'iban', 'phone' veya 'email' olmalıdır")
	}
	if err != nil {
		return nil, fmt.Errorf("fraud taraması başarısız: %w", err)
	}
	defer rows.Close()

	matches := make([]FraudMatch, 0)
	for rows.Next() {
		var m FraudMatch
		if err := rows.Scan(&m.UserID, &m.Name, &m.MemberCode, &m.Email, &m.Phone); err != nil {
			return nil, fmt.Errorf("tarama satırı okunamadı: %w", err)
		}
		m.MatchedField = field
		m.MatchedValue = value
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("tarama satırları okunamadı: %w", err)
	}

	for i := range matches {
		n := len(matches)
		switch {
		case n >= 3:
			matches[i].Risk = "high"
		case n == 2:
			matches[i].Risk = "medium"
		default:
			matches[i].Risk = "low"
		}
		matches[i].Count = n
	}
	return matches, nil
}
