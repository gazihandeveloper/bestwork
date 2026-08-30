package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"mlm-backend/internal/models"
)

// ErrRankNotFound rütbe bulunamadığında döndürülür.
var ErrRankNotFound = errors.New("rütbe bulunamadı")

// rankColumns tüm rank alanlarını listeler (kariyer kolonları dahil).
const rankColumns = `id, name, required_left_pv, required_right_pv, monthly_binary_limit,
	required_downline_rank_id, required_downline_count, personal_activity_pv, created_at`

// GetAllRanks tüm rütbeleri (kariyer seviyeleri) id'ye göre artan sırada döndürür.
// id sırası kariyer merdiveni sırasıdır (Jade → Ambassador).
func GetAllRanks(ctx context.Context, q DBTX) ([]models.Rank, error) {
	rows, err := q.Query(ctx, `SELECT `+rankColumns+` FROM ranks ORDER BY id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ranks := make([]models.Rank, 0)
	for rows.Next() {
		var r models.Rank
		if err := rows.Scan(&r.ID, &r.Name, &r.RequiredLeftPV, &r.RequiredRightPV, &r.MonthlyBinaryLimit,
			&r.RequiredDownlineRankID, &r.RequiredDownlineCount, &r.PersonalActivityPV, &r.CreatedAt); err != nil {
			return nil, err
		}
		ranks = append(ranks, r)
	}
	return ranks, rows.Err()
}

// GetRankByID ID'ye göre rütbeyi döndürür.
func GetRankByID(ctx context.Context, q DBTX, id int) (*models.Rank, error) {
	var r models.Rank
	err := q.QueryRow(ctx, `SELECT `+rankColumns+` FROM ranks WHERE id = $1`, id).
		Scan(&r.ID, &r.Name, &r.RequiredLeftPV, &r.RequiredRightPV, &r.MonthlyBinaryLimit,
			&r.RequiredDownlineRankID, &r.RequiredDownlineCount, &r.PersonalActivityPV, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRankNotFound
		}
		return nil, err
	}
	return &r, nil
}

// CreateRank yeni bir seviye (kariyer) ekler (admin).
func CreateRank(ctx context.Context, q DBTX, r *models.Rank) (*models.Rank, error) {
	if r.Name == "" || r.RequiredLeftPV < 0 || r.RequiredRightPV < 0 || r.MonthlyBinaryLimit < 0 || r.RequiredDownlineCount < 0 {
		return nil, errors.New("geçersiz seviye bilgileri")
	}
	err := q.QueryRow(ctx,
		`INSERT INTO ranks (name, required_left_pv, required_right_pv, monthly_binary_limit,
			required_downline_rank_id, required_downline_count, personal_activity_pv)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		r.Name, r.RequiredLeftPV, r.RequiredRightPV, r.MonthlyBinaryLimit,
		r.RequiredDownlineRankID, r.RequiredDownlineCount, r.PersonalActivityPV).
		Scan(&r.ID, &r.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("seviye eklenemedi: %w", err)
	}
	return r, nil
}

// UpdateRank seviyenin tüm değişebilir alanlarını günceller (admin).
func UpdateRank(ctx context.Context, q DBTX, r *models.Rank) error {
	if r.Name == "" || r.RequiredLeftPV < 0 || r.RequiredRightPV < 0 || r.MonthlyBinaryLimit < 0 || r.RequiredDownlineCount < 0 {
		return errors.New("geçersiz seviye bilgileri")
	}
	tag, err := q.Exec(ctx,
		`UPDATE ranks SET name = $1, required_left_pv = $2, required_right_pv = $3, monthly_binary_limit = $4,
			required_downline_rank_id = $5, required_downline_count = $6, personal_activity_pv = $7
		 WHERE id = $8`,
		r.Name, r.RequiredLeftPV, r.RequiredRightPV, r.MonthlyBinaryLimit,
		r.RequiredDownlineRankID, r.RequiredDownlineCount, r.PersonalActivityPV, r.ID)
	if err != nil {
		return fmt.Errorf("seviye güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRankNotFound
	}
	return nil
}

// DeleteRank seviyeyi siler (kullanıcılar tarafından referans ediliyorsa hata döner).
func DeleteRank(ctx context.Context, q DBTX, id int) error {
	tag, err := q.Exec(ctx, `DELETE FROM ranks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("seviye silinemedi (kullanıcılar bu seviyeyi kullanıyor olabilir): %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRankNotFound
	}
	return nil
}
