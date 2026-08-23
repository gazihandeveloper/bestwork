package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// ErrRankNotFound rütbe bulunamadığında döndürülür.
var ErrRankNotFound = errors.New("rütbe bulunamadı")

// GetAllRanks tüm rütbeleri eşik değerlerine göre artan sırada döndürür.
func GetAllRanks(ctx context.Context, q DBTX) ([]models.Rank, error) {
	rows, err := q.Query(ctx, `SELECT id, name, required_left_pv, required_right_pv, monthly_binary_limit, created_at
		FROM ranks ORDER BY required_left_pv ASC, required_right_pv ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ranks := make([]models.Rank, 0)
	for rows.Next() {
		var r models.Rank
		if err := rows.Scan(&r.ID, &r.Name, &r.RequiredLeftPV, &r.RequiredRightPV, &r.MonthlyBinaryLimit, &r.CreatedAt); err != nil {
			return nil, err
		}
		ranks = append(ranks, r)
	}
	return ranks, rows.Err()
}

// GetRankByID ID'ye göre rütbeyi döndürür.
func GetRankByID(ctx context.Context, q DBTX, id int) (*models.Rank, error) {
	var r models.Rank
	err := q.QueryRow(ctx, `SELECT id, name, required_left_pv, required_right_pv, monthly_binary_limit, created_at
		FROM ranks WHERE id = $1`, id).
		Scan(&r.ID, &r.Name, &r.RequiredLeftPV, &r.RequiredRightPV, &r.MonthlyBinaryLimit, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRankNotFound
		}
		return nil, err
	}
	return &r, nil
}

// UpdateUserRankFromLegs kullanıcının sol/sağ bacak PV toplamlarına göre
// hak ettiği en yüksek rütbeyi bulur; değişiklik varsa günceller ve
// rank_progress tablosuna kayıt ekler.
func UpdateUserRankFromLegs(ctx context.Context, q DBTX, userID int64) error {
	var (
		leftPV, rightPV int64
		currentRankID   *int
	)
	err := q.QueryRow(ctx,
		`SELECT total_pv_left, total_pv_right, current_rank_id FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&leftPV, &rightPV, &currentRankID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("kullanıcı okunamadı: %w", err)
	}

	ranks, err := GetAllRanks(ctx, q)
	if err != nil {
		return err
	}

	// Şartları sağlayan en yüksek rütbeyi bul
	var newRank *models.Rank
	for i := range ranks {
		if leftPV >= ranks[i].RequiredLeftPV && rightPV >= ranks[i].RequiredRightPV {
			newRank = &ranks[i]
		}
	}

	// Uygun rütbe yoksa veya değişiklik yoksa dokunma
	if newRank == nil {
		return nil
	}
	if currentRankID != nil && *currentRankID == newRank.ID {
		return nil
	}

	// Ara rütbeler dahil TÜM geçilen seviyeleri kaydet (atlanmaz).
	// ranks artan eşik sırasında gelir; newRank'a kadar olan her rütbe geçilmiştir.
	for i := range ranks {
		r := ranks[i]
		if leftPV < r.RequiredLeftPV || rightPV < r.RequiredRightPV {
			continue
		}
		if _, err := q.Exec(ctx,
			`INSERT INTO rank_progress (user_id, rank_id)
			 SELECT $1, $2
			 WHERE NOT EXISTS (SELECT 1 FROM rank_progress WHERE user_id = $1 AND rank_id = $2)`,
			userID, r.ID); err != nil {
			return fmt.Errorf("rütbe ilerlemesi kaydedilemedi: %w", err)
		}
	}

	if _, err := q.Exec(ctx, `UPDATE users SET current_rank_id = $1, updated_at = NOW() WHERE id = $2`, newRank.ID, userID); err != nil {
		return fmt.Errorf("rütbe güncellenemedi: %w", err)
	}

	log.WithFields(log.Fields{
		"user_id":  userID,
		"rank":     newRank.Name,
		"pv_left":  leftPV,
		"pv_right": rightPV,
	}).Info("Kullanıcı rütbesi güncellendi")

	return nil
}
