package services

import (
	"context"
	"fmt"

	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// RecomputeAllCareers tüm üyelerin kariyerlerini (rütbelerini) yeniden hesaplar.
//
// Sıralama kritiktir: PV bazlı alt basamaklar (Jade, Pearl) önce, downline bazlı
// üst basamaklar (Safir → Ambassador) sonra işlenir; böylece bir üyenin Safir şartı,
// altındaki üyenin taze Jade unvanını görür. Kariyer her ay yeniden değerlendirildiği
// için önce tüm current_rank_id'ler NULL'a çekilir, sonra hak edilen en yüksek basamak
// atanır. Transaction (DBTX) içinde çalışır.
func RecomputeAllCareers(ctx context.Context, q DBTX) (int, error) {
	ranks, err := GetAllRanks(ctx, q)
	if err != nil {
		return 0, fmt.Errorf("seviyeler okunamadı: %w", err)
	}

	// Her ay yeniden değerlendirme: tüm unvanları sıfırla (aktif olmayanlar unvanını kaybeder).
	if _, err := q.Exec(ctx, `UPDATE users SET current_rank_id = NULL, updated_at = NOW()`); err != nil {
		return 0, fmt.Errorf("kariyer sıfırlanamadı: %w", err)
	}

	rows, err := q.Query(ctx, `SELECT id FROM users WHERE is_active = true ORDER BY id`)
	if err != nil {
		return 0, fmt.Errorf("üyeler listelenemedi: %w", err)
	}
	defer rows.Close()

	userIDs := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return 0, fmt.Errorf("üye okunamadı: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	rows.Close()

	assigned := 0
	for _, rank := range ranks {
		for _, uid := range userIDs {
			ok, err := userQualifiesForRank(ctx, q, uid, rank)
			if err != nil {
				return 0, fmt.Errorf("kariyer kontrolü başarısız (user %d, rank %s): %w", uid, rank.Name, err)
			}
			if !ok {
				continue
			}
			if _, err := q.Exec(ctx,
				`UPDATE users SET current_rank_id = $1, updated_at = NOW() WHERE id = $2`,
				rank.ID, uid); err != nil {
				return 0, fmt.Errorf("unvan atanamadı: %w", err)
			}
			if _, err := q.Exec(ctx,
				`INSERT INTO rank_progress (user_id, rank_id)
				 SELECT $1, $2
				 WHERE NOT EXISTS (SELECT 1 FROM rank_progress WHERE user_id = $1 AND rank_id = $2)`,
				uid, rank.ID); err != nil {
				return 0, fmt.Errorf("kariyer ilerlemesi kaydedilemedi: %w", err)
			}
			assigned++
		}
	}

	log.WithFields(log.Fields{"users": len(userIDs), "assignments": assigned}).
		Info("Kariyerler yeniden hesaplandı")
	return len(userIDs), nil
}

// userQualifiesForRank üyenin verilen kariyer şartını sağlayıp sağlamadığını döndürür.
func userQualifiesForRank(ctx context.Context, q DBTX, userID int64, rank models.Rank) (bool, error) {
	var leftPV, rightPV, monthPV int64
	if err := q.QueryRow(ctx,
		`SELECT total_pv_left, total_pv_right, current_month_personal_pv FROM users WHERE id = $1`,
		userID).Scan(&leftPV, &rightPV, &monthPV); err != nil {
		return false, err
	}

	// PV / toplam ciro şartı (spillover dahil — bacak PV toplamına bakar).
	if leftPV < rank.RequiredLeftPV || rightPV < rank.RequiredRightPV {
		return false, nil
	}

	// Kişisel aktiflik şartı (tüm kariyerlerde).
	if rank.PersonalActivityPV > 0 && monthPV < rank.PersonalActivityPV {
		return false, nil
	}

	// Downline (kişi/kariyer) şartı — kendi neslinden, her bacak ayrı sayılır.
	if rank.RequiredDownlineCount > 0 && rank.RequiredDownlineRankID != nil {
		leftCount, err := countOwnLineageQualifiedInLeg(ctx, q, userID, "L", *rank.RequiredDownlineRankID)
		if err != nil {
			return false, err
		}
		if leftCount < rank.RequiredDownlineCount {
			return false, nil
		}
		rightCount, err := countOwnLineageQualifiedInLeg(ctx, q, userID, "R", *rank.RequiredDownlineRankID)
		if err != nil {
			return false, err
		}
		if rightCount < rank.RequiredDownlineCount {
			return false, nil
		}
	}

	return true, nil
}

// countOwnLineageQualifiedInLeg üyenin belirtilen binary bacağında, kendi sponsorluk
// soyundan (spillover hariç) ve belirtilen rütbeye ulaşmış kaç üye olduğunu sayar.
// "Kendi neslinden" = sponsor_id zinciriyle üyeye bağlı; "bacak" = parent_id zinciriyle
// üyenin sol/sağ alt ağacı. Sonsuz derinlikte arar (recursive CTE).
func countOwnLineageQualifiedInLeg(ctx context.Context, q DBTX, userID int64, leg string, rankID int) (int, error) {
	var count int
	err := q.QueryRow(ctx, `
		WITH RECURSIVE
		own_lineage AS (
			SELECT id FROM users WHERE sponsor_id = $1
			UNION ALL
			SELECT u.id FROM users u JOIN own_lineage o ON u.sponsor_id = o.id
		),
		leg_subtree AS (
			SELECT id FROM users WHERE parent_id = $1 AND position = $2
			UNION ALL
			SELECT u.id FROM users u JOIN leg_subtree s ON u.parent_id = s.id
		)
		SELECT COUNT(*) FROM users m
		WHERE m.id IN (SELECT id FROM own_lineage)
		  AND m.id IN (SELECT id FROM leg_subtree)
		  AND m.current_rank_id = $3`,
		userID, leg, rankID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
