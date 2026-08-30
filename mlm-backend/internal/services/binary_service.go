package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"
)

// matchingRates 5 nesil matching bonusu oranlarıdır (%20, %10, %10, %10, %5).
var matchingRates = []float64{0.20, 0.10, 0.10, 0.10, 0.05}

// DistributePVAndCVToUpline kullanıcının parent'ından başlayarak köke kadar
// tüm üst hattaki üyelerin ilgili bacaklarına PV/CV ekler ve her ekleme için
// binary_transactions tablosuna hareket kaydı yazar.
// NOT: Binary eşleşme ve rütbe güncellemesi artık burada YAPILMAZ; bunlar
// aylık kapanışta (ProcessMonthlyClose) toplu olarak çalıştırılır.
func DistributePVAndCVToUpline(ctx context.Context, q DBTX, userID int64, pv, cv int64, position, description string, relatedOrderID *int64) error {
	var parentID *int64
	if err := q.QueryRow(ctx, `SELECT parent_id FROM users WHERE id = $1`, userID).Scan(&parentID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("kullanıcı okunamadı: %w", err)
	}
	if parentID == nil {
		return nil // kullanıcı ağaca yerleşmemiş
	}

	currentID := *parentID
	pos := position

	for currentID != 0 {
		var (
			nextParentID                     *int64
			nextPos                          *string
			pvLeft, pvRight, cvLeft, cvRight int64
		)
		err := q.QueryRow(ctx,
			`SELECT parent_id, position, total_pv_left, total_pv_right, total_cv_left, total_cv_right
			 FROM users WHERE id = $1 FOR UPDATE`, currentID).
			Scan(&nextParentID, &nextPos, &pvLeft, &pvRight, &cvLeft, &cvRight)
		if err != nil {
			return fmt.Errorf("üst hat üyesi okunamadı: %w", err)
		}

		if pos == "L" {
			pvLeft += pv
			cvLeft += cv
		} else {
			pvRight += pv
			cvRight += cv
		}

		if _, err := q.Exec(ctx,
			`UPDATE users SET total_pv_left = $1, total_pv_right = $2, total_cv_left = $3, total_cv_right = $4, updated_at = NOW() WHERE id = $5`,
			pvLeft, pvRight, cvLeft, cvRight, currentID); err != nil {
			return fmt.Errorf("üst hat bacakları güncellenemedi: %w", err)
		}

		// Hareket kaydı (yalnızca gerçek değişim varsa)
		if pv > 0 || cv > 0 {
			if err := AddBinaryTransaction(ctx, q, currentID, pos, "add", pv, cv, description, relatedOrderID); err != nil {
				return err
			}
		}

		// Canlı eşleşme: üst hatta puan düştüğü anda binary eşleşmesini hemen çalıştır
		// (ay sonu kapanışı beklenmez; borsa gibi anlık bonus yansır).
		if err := MatchBinary(ctx, q, currentID); err != nil {
			return err
		}

		if nextPos == nil || nextParentID == nil {
			break
		}
		pos = *nextPos
		currentID = *nextParentID
	}

	return nil
}

// MatchBinary üyenin bacaklarında biriken CV'leri eşleştirir, binary bonusu
// öder (flashout limiti dahilinde) ve eşleşen CV'yi her iki bacaktan düşer.
func MatchBinary(ctx context.Context, q DBTX, memberID int64) error {
	var (
		packageID         *int
		rankID            *int
		cvLeft, cvRight   int64
		monthBinaryEarned float64
	)
	err := q.QueryRow(ctx,
		`SELECT package_id, current_rank_id, total_cv_left, total_cv_right, current_month_binary_earned
		 FROM users WHERE id = $1 FOR UPDATE`, memberID).
		Scan(&packageID, &rankID, &cvLeft, &cvRight, &monthBinaryEarned)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("üye okunamadı: %w", err)
	}

	matched := cvLeft
	if cvRight < matched {
		matched = cvRight
	}
	if matched <= 0 {
		return nil
	}

	// Paket yoksa binary bonus ödenmez; eşleşme atlanır (CV tüketilmez)
	if packageID == nil {
		return nil
	}

	var rate float64
	if err := q.QueryRow(ctx, `SELECT binary_bonus_rate FROM packages WHERE id = $1`, *packageID).Scan(&rate); err != nil {
		return fmt.Errorf("paket okunamadı: %w", err)
	}
	if rate <= 0 {
		return nil
	}

	binaryBonus := round2(float64(matched) * rate)

	// Flashout limiti: güncel rütbenin aylık limiti
	if rankID != nil {
		var limit float64
		if err := q.QueryRow(ctx, `SELECT monthly_binary_limit FROM ranks WHERE id = $1`, *rankID).Scan(&limit); err != nil {
			return fmt.Errorf("rütbe okunamadı: %w", err)
		}
		if limit > 0 {
			remaining := limit - monthBinaryEarned
			if binaryBonus > remaining {
				binaryBonus = remaining
			}
		}
	}

	// Flashout/cap: settings'ten günlük ve haftalık üst kazanç limitleri (0 = kapalı).
	// Limiti aşan kısım kesilir ve flashout_logs'a ihlal kaydı yazılır.
	binaryBonus = applyFlashoutCaps(ctx, q, memberID, binaryBonus)

	// Eşleşen CV her iki bacaktan düşülür (bonus 0 olsa bile tüketilir)
	if _, err := q.Exec(ctx,
		`UPDATE users SET total_cv_left = total_cv_left - $1, total_cv_right = total_cv_right - $1, updated_at = NOW() WHERE id = $2`,
		matched, memberID); err != nil {
		return fmt.Errorf("bacak CV düşümü başarısız: %w", err)
	}

	// Her iki bacak için düşüm hareket kaydı
	if err := AddBinaryTransaction(ctx, q, memberID, "L", "deduct", 0, matched, "Binary eşleşme", nil); err != nil {
		return err
	}
	if err := AddBinaryTransaction(ctx, q, memberID, "R", "deduct", 0, matched, "Binary eşleşme", nil); err != nil {
		return err
	}

	if binaryBonus <= 0 {
		log.WithFields(log.Fields{"member_id": memberID, "matched_cv": matched}).
			Info("Binary eşleşme: bonus ödenmedi (limit doldu), CV tüketildi")
		return nil
	}

	if _, err := q.Exec(ctx,
		`UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2`,
		binaryBonus, memberID); err != nil {
		return fmt.Errorf("cüzdan güncellenemedi: %w", err)
	}

	if _, err := q.Exec(ctx,
		`INSERT INTO commissions (user_id, from_user_id, type, amount, related_cv, status, paid_at)
		 VALUES ($1, NULL, 'binary', $2, $3, 'paid', NOW())`,
		memberID, binaryBonus, matched); err != nil {
		return fmt.Errorf("binary komisyon kaydı eklenemedi: %w", err)
	}

	if _, err := q.Exec(ctx,
		`UPDATE users SET current_month_binary_earned = current_month_binary_earned + $1, updated_at = NOW() WHERE id = $2`,
		binaryBonus, memberID); err != nil {
		return fmt.Errorf("aylık binary kazanç güncellenemedi: %w", err)
	}

	log.WithFields(log.Fields{
		"member_id":  memberID,
		"matched_cv": matched,
		"bonus":      binaryBonus,
	}).Info("Binary bonusu ödendi")

	// Matching bonusunu üst hatta dağıt
	return DistributeMatchingBonus(ctx, q, memberID, binaryBonus)
}

// applyFlashoutCaps binary bonusuna günlük/haftalık flashout limitlerini
// uygular. Settings'te limit 0 veya yoksa o dönem sınırsızdır. Limiti aşan
// kısım kesilir ve flashout_logs'a ihlal kaydı yazılır.
func applyFlashoutCaps(ctx context.Context, q DBTX, memberID int64, bonus float64) float64 {
	if bonus <= 0 {
		return bonus
	}

	caps := []struct {
		key    string
		period string
		start  string // SQL zaman ifadesi
	}{
		{"flashout_daily_limit", "daily", "date_trunc('day', NOW())"},
		{"flashout_weekly_limit", "weekly", "date_trunc('week', NOW())"},
	}

	for _, cap := range caps {
		var raw string
		if err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, cap.key).Scan(&raw); err != nil {
			continue // anahtar yok = limit yok
		}
		limit, err := strconv.ParseFloat(raw, 64)
		if err != nil || limit <= 0 {
			continue
		}

		var earned float64
		if err := q.QueryRow(ctx, `
			SELECT COALESCE(SUM(amount), 0) FROM commissions
			WHERE user_id = $1 AND type = 'binary' AND status = 'paid' AND paid_at >= `+cap.start,
			memberID).Scan(&earned); err != nil {
			continue
		}

		remaining := limit - earned
		if remaining <= 0 {
			if bonus > 0 {
				logFlashoutViolation(ctx, q, memberID, cap.period, limit, earned, bonus)
			}
			bonus = 0
			continue
		}
		if bonus > remaining {
			logFlashoutViolation(ctx, q, memberID, cap.period, limit, earned, bonus-remaining)
			bonus = remaining
		}
	}
	return bonus
}

// logFlashoutViolation flashout limitinin aşan kısmını flashout_logs'a yazar.
func logFlashoutViolation(ctx context.Context, q DBTX, memberID int64, period string, limit, earned, capped float64) {
	if _, err := q.Exec(ctx, `
		INSERT INTO flashout_logs (user_id, period, limit_amount, earned_amount, capped_amount)
		VALUES ($1, $2, $3, $4, $5)`,
		memberID, period, limit, earned, capped); err != nil {
		log.WithError(err).WithField("member_id", memberID).Warn("Flashout ihlali kaydedilemedi")
	}
}

// DistributeMatchingBonus binary kazanan üyenin sponsor zincirine 5 nesil
// boyunca matching (liderlik) bonusu dağıtır. Her nesil yalnızca kariyer sahibi
// (Jade+) ise pay alır; kariyeri olmayan nesil pay almaz ve payı devredilmez
// (şirkete kalır).
func DistributeMatchingBonus(ctx context.Context, q DBTX, binaryEarnerID int64, amount float64) error {
	currentID := binaryEarnerID

	for _, rate := range matchingRates {
		var sponsorID *int64
		if err := q.QueryRow(ctx, `SELECT sponsor_id FROM users WHERE id = $1`, currentID).Scan(&sponsorID); err != nil {
			return fmt.Errorf("sponsor okunamadı: %w", err)
		}
		if sponsorID == nil {
			break // sponsor zinciri sona erdi
		}

		// Liderlik primi yalnızca kariyer sahibi (Jade+) üst hatta ödenir.
		// Kariyeri olmayan nesil pay almaz; pay DEVREDİLMEZ (şirkete kalır).
		var hasCareer bool
		if err := q.QueryRow(ctx, `SELECT (current_rank_id IS NOT NULL) FROM users WHERE id = $1`, *sponsorID).Scan(&hasCareer); err != nil {
			return fmt.Errorf("sponsor kariyeri okunamadı: %w", err)
		}
		if !hasCareer {
			currentID = *sponsorID
			continue
		}

		bonus := round2(amount * rate)
		if bonus > 0 {
			if _, err := q.Exec(ctx,
				`UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2`,
				bonus, *sponsorID); err != nil {
				return fmt.Errorf("matching cüzdan güncellemesi başarısız: %w", err)
			}

			if _, err := q.Exec(ctx,
				`INSERT INTO commissions (user_id, from_user_id, type, amount, status, paid_at)
				 VALUES ($1, $2, 'matching', $3, 'paid', NOW())`,
				*sponsorID, binaryEarnerID, bonus); err != nil {
				return fmt.Errorf("matching komisyon kaydı eklenemedi: %w", err)
			}

			log.WithFields(log.Fields{
				"earner_id":    *sponsorID,
				"from_user_id": binaryEarnerID,
				"amount":       bonus,
			}).Info("Matching bonusu ödendi")
		}

		currentID = *sponsorID
	}

	return nil
}

// ProcessNewOrderForBinary sipariş sonrası binary ağaç güncellemesini tetikler.
// Kullanıcı ağaca yerleşmemişse hiçbir işlem yapmaz.
func ProcessNewOrderForBinary(ctx context.Context, q DBTX, userID int64, pv, cv int64, relatedOrderID *int64) error {
	var parentID *int64
	var position *string
	if err := q.QueryRow(ctx, `SELECT parent_id, position FROM users WHERE id = $1`, userID).Scan(&parentID, &position); err != nil {
		return fmt.Errorf("kullanıcı okunamadı: %w", err)
	}
	if parentID == nil || position == nil || (*position != "L" && *position != "R") {
		return nil // kullanıcı henüz ağaca yerleşmemiş
	}

	return DistributePVAndCVToUpline(ctx, q, userID, pv, cv, *position, "Sipariş kaynaklı puan ekleme", relatedOrderID)
}

// ProcessPlacementForBinary yerleştirme sonrası binary ağaç güncellemesini tetikler.
func ProcessPlacementForBinary(ctx context.Context, q DBTX, userID int64, pv, cv int64, position string) error {
	return DistributePVAndCVToUpline(ctx, q, userID, pv, cv, position, "Yerleştirme kaynaklı puan ekleme", nil)
}
