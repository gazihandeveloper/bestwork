package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// ErrEarningPlanNotFound kazanç planı bulunamadığında döndürülür.
var ErrEarningPlanNotFound = errors.New("kazanç kalemi bulunamadı")

// ErrEarningPlanDuplicate kod zaten kullanımda olduğunda döndürülür.
var ErrEarningPlanDuplicate = errors.New("bu kod zaten kullanılıyor")

// ErrEarningPlanInvalid doğrulama hatalarında döndürülür.
var ErrEarningPlanInvalid = errors.New("geçersiz kazanç kalemi")

// EarningPlanService kazanç planı (Network Ayarları) CRUD işlemlerini yürütür.
type EarningPlanService struct {
	db *pgxpool.Pool
}

// NewEarningPlanService yeni bir EarningPlanService örneği döndürür.
func NewEarningPlanService(db *pgxpool.Pool) *EarningPlanService {
	return &EarningPlanService{db: db}
}

const earningPlanColumns = `id, code, title, description, payout_type, max_rate, scope, period, activity_mode, check_matching, depth, sort_order, is_active, created_at, updated_at`

func scanEarningPlan(row pgx.Row) (*models.EarningPlan, error) {
	var p models.EarningPlan
	if err := row.Scan(&p.ID, &p.Code, &p.Title, &p.Description, &p.PayoutType, &p.MaxRate, &p.Scope,
		&p.Period, &p.ActivityMode, &p.CheckMatching, &p.Depth, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEarningPlanNotFound
		}
		return nil, fmt.Errorf("kazanç kalemi okunamadı: %w", err)
	}
	return &p, nil
}

// List tüm kazanç kalemlerini (ve oranlarını) sıralı döndürür.
func (s *EarningPlanService) List(ctx context.Context, onlyActive bool) ([]models.EarningPlan, error) {
	query := `SELECT ` + earningPlanColumns + ` FROM earning_plans`
	if onlyActive {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY sort_order ASC, id ASC`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("kazanç kalemleri listelenemedi: %w", err)
	}
	defer rows.Close()

	plans := make([]models.EarningPlan, 0)
	ids := make([]int64, 0)
	for rows.Next() {
		var p models.EarningPlan
		if err := rows.Scan(&p.ID, &p.Code, &p.Title, &p.Description, &p.PayoutType, &p.MaxRate, &p.Scope,
			&p.Period, &p.ActivityMode, &p.CheckMatching, &p.Depth, &p.SortOrder, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("kazanç kalemi okunamadı: %w", err)
		}
		plans = append(plans, p)
		ids = append(ids, p.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	ratesByPlan, err := s.ratesForPlans(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range plans {
		plans[i].Rates = ratesByPlan[plans[i].ID]
	}
	return plans, nil
}

// GetByID kalemi oranlarıyla birlikte döndürür.
func (s *EarningPlanService) GetByID(ctx context.Context, id int64) (*models.EarningPlan, error) {
	p, err := scanEarningPlan(s.db.QueryRow(ctx, `SELECT `+earningPlanColumns+` FROM earning_plans WHERE id = $1`, id))
	if err != nil {
		return nil, err
	}
	ratesByPlan, err := s.ratesForPlans(ctx, []int64{id})
	if err != nil {
		return nil, err
	}
	p.Rates = ratesByPlan[id]
	return p, nil
}

// ratesForPlans verilen planların oranlarını harita olarak döndürür.
func (s *EarningPlanService) ratesForPlans(ctx context.Context, planIDs []int64) (map[int64][]models.EarningPlanRate, error) {
	out := make(map[int64][]models.EarningPlanRate)
	if len(planIDs) == 0 {
		return out, nil
	}
	rows, err := s.db.Query(ctx,
		`SELECT id, plan_id, rank_id, depth, rate FROM earning_plan_rates WHERE plan_id = ANY($1) ORDER BY depth, rank_id`, planIDs)
	if err != nil {
		return nil, fmt.Errorf("oranlar okunamadı: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var r models.EarningPlanRate
		if err := rows.Scan(&r.ID, &r.PlanID, &r.RankID, &r.Depth, &r.Rate); err != nil {
			return nil, fmt.Errorf("oran okunamadı: %w", err)
		}
		out[r.PlanID] = append(out[r.PlanID], r)
	}
	return out, rows.Err()
}

func validPayoutType(v string) bool { return v == "gelir" || v == "puan" || v == "bonus" }
func validScope(v string) bool      { return v == "product" || v == "tree" }
func validPeriod(v string) bool     { return v == "daily" || v == "weekly" || v == "monthly" }
func validActivity(v string) bool   { return v == "none" || v == "personal" || v == "team" }

// saveRates bir planın oran matrisini topluca kaydeder (önce siler, sonra ekler).
func (s *EarningPlanService) saveRates(ctx context.Context, q DBTX, planID int64, rates []models.EarningPlanRate) error {
	if _, err := q.Exec(ctx, `DELETE FROM earning_plan_rates WHERE plan_id = $1`, planID); err != nil {
		return fmt.Errorf("oranlar temizlenemedi: %w", err)
	}
	for _, r := range rates {
		if r.Rate == 0 {
			continue
		}
		if _, err := q.Exec(ctx,
			`INSERT INTO earning_plan_rates (plan_id, rank_id, depth, rate) VALUES ($1, $2, $3, $4)`,
			planID, r.RankID, r.Depth, r.Rate); err != nil {
			return fmt.Errorf("oran kaydedilemedi: %w", err)
		}
	}
	return nil
}

// Create yeni kazanç kalemi ekler (oranlarla).
func (s *EarningPlanService) Create(ctx context.Context, p *models.EarningPlan) (*models.EarningPlan, error) {
	if err := s.normalize(p); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrEarningPlanInvalid, err.Error())
	}
	if p.Code == "" {
		return nil, fmt.Errorf("%w: kod zorunludur", ErrEarningPlanInvalid)
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO earning_plans (code, title, description, payout_type, max_rate, scope, period, activity_mode, check_matching, depth, sort_order, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, created_at, updated_at`,
		p.Code, p.Title, p.Description, p.PayoutType, p.MaxRate, p.Scope, p.Period, p.ActivityMode, p.CheckMatching, p.Depth, p.SortOrder, p.IsActive).
		Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEarningPlanDuplicate
		}
		return nil, fmt.Errorf("kazanç kalemi eklenemedi: %w", err)
	}
	if err := s.saveRates(ctx, tx, p.ID, p.Rates); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}
	return s.GetByID(ctx, p.ID)
}

// Update kazanç kalemini ve oranlarını günceller.
func (s *EarningPlanService) Update(ctx context.Context, p *models.EarningPlan) (*models.EarningPlan, error) {
	if err := s.normalize(p); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrEarningPlanInvalid, err.Error())
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE earning_plans SET title=$1, description=$2, payout_type=$3, max_rate=$4, scope=$5, period=$6,
		        activity_mode=$7, check_matching=$8, depth=$9, sort_order=$10, is_active=$11, updated_at=NOW()
		 WHERE id=$12`,
		p.Title, p.Description, p.PayoutType, p.MaxRate, p.Scope, p.Period, p.ActivityMode, p.CheckMatching, p.Depth, p.SortOrder, p.IsActive, p.ID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEarningPlanDuplicate
		}
		return nil, fmt.Errorf("kazanç kalemi güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrEarningPlanNotFound
	}
	// rates nil ise (gövdede hiç gönderilmediyse) mevcut oranlara DOKUNMA.
	if p.Rates != nil {
		if err := s.saveRates(ctx, tx, p.ID, p.Rates); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}
	return s.GetByID(ctx, p.ID)
}

// Delete kazanç kalemini siler.
func (s *EarningPlanService) Delete(ctx context.Context, id int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM earning_plans WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("kazanç kalemi silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrEarningPlanNotFound
	}
	return nil
}

// normalize alanları doğrular/temizler.
func (s *EarningPlanService) normalize(p *models.EarningPlan) error {
	p.Title = strings.TrimSpace(p.Title)
	p.Code = strings.ToLower(strings.TrimSpace(p.Code))
	if p.Title == "" {
		return errors.New("başlık zorunludur")
	}
	if !validPayoutType(p.PayoutType) {
		return errors.New("geçersiz tür (gelir/puan/bonus)")
	}
	if !validScope(p.Scope) {
		return errors.New("geçersiz kapsam (product/tree)")
	}
	if !validPeriod(p.Period) {
		return errors.New("geçersiz dönem (daily/weekly/monthly)")
	}
	if !validActivity(p.ActivityMode) {
		return errors.New("geçersiz aktiflik (none/personal/team)")
	}
	if p.MaxRate < 0 || p.MaxRate > 100 {
		return errors.New("maksimum oran 0-100 arasında olmalıdır")
	}
	if p.Depth < 0 {
		p.Depth = 0
	}
	if p.Depth > 20 {
		return errors.New("derinlik en fazla 20 olabilir")
	}
	// Oran matrisi doğrulaması
	for _, r := range p.Rates {
		if r.Rate == 0 {
			continue
		}
		if r.RankID <= 0 {
			return errors.New("geçersiz kariyer")
		}
		if r.Depth < 1 || (p.Depth > 0 && r.Depth > p.Depth) {
			return errors.New("geçersiz derinlik")
		}
		if r.Rate < 0 || r.Rate > 100 {
			return errors.New("oran 0-100 arasında olmalıdır")
		}
		if p.MaxRate > 0 && r.Rate > p.MaxRate {
			return errors.New("oran, maksimum dağıtım oranını aşamaz")
		}
	}
	return nil
}
