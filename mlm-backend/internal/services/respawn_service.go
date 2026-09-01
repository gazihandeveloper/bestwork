package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// ErrRespawnNotEligible yeniden üyelik şartlarının sağlanmadığını belirtir.
var ErrRespawnNotEligible = errors.New("üye yeniden üyelik için uygun değil (en az 1 yıl üyelik şartı ve son 1 yılda alışveriş/yeni kayıt yapmamış olması gerekir)")

// RespawnUser eski üyeliği askıya alıp aynı kişi için yeni sponsorla sıfırdan
// üyelik açar. Şart: son 1 yılda ürün almamış VE yeni üye kaydetmemiş olmalı.
// Eski üyeliğin e-posta/telefonu serbest bırakılır (yeni üyelik aynı bilgileri alır),
// şifre korunur, PV/CV/rütbe/paket sıfırdan başlar.
func RespawnUser(ctx context.Context, q DBTX, userID, newSponsorID, adminID int64, adminName string) (*models.User, error) {
	if userID == newSponsorID {
		return nil, errors.New("üye kendi kendine sponsor olamaz")
	}

	var (
		name         string
		email        string
		phone        *string
		passwordHash string
		memberCode   string
		isActive     bool
		role         string
		createdAt    time.Time
	)
	if err := q.QueryRow(ctx,
		`SELECT name, email, phone, password_hash, member_code, is_active, role, created_at
		 FROM users WHERE id = $1 FOR UPDATE`, userID).
		Scan(&name, &email, &phone, &passwordHash, &memberCode, &isActive, &role, &createdAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("üye okunamadı: %w", err)
	}

	if !isActive {
		return nil, errors.New("üye zaten askıya alınmış")
	}
	if role == "admin" || role == "super_admin" {
		return nil, errors.New("yönetici hesapları yeniden üyelik yapamaz")
	}

	// Son 1 yıl şartı: ürün almamış + yeni üye kaydetmemiş olmalı.
	var lastOrder, lastReg *time.Time
	if err := q.QueryRow(ctx,
		`SELECT MAX(created_at) FROM orders WHERE user_id = $1 AND status <> 'cancelled'`, userID).Scan(&lastOrder); err != nil {
		return nil, fmt.Errorf("sipariş geçmişi okunamadı: %w", err)
	}
	if err := q.QueryRow(ctx,
		`SELECT MAX(created_at) FROM users WHERE sponsor_id = $1`, userID).Scan(&lastReg); err != nil {
		return nil, fmt.Errorf("kayıt geçmişi okunamadı: %w", err)
	}
	cutoff := time.Now().AddDate(-1, 0, 0)
	// En az 1 yıl üyelik şartı + son 1 yılda hareket olmamalı.
	if createdAt.After(cutoff) {
		return nil, ErrRespawnNotEligible
	}
	if (lastOrder != nil && lastOrder.After(cutoff)) || (lastReg != nil && lastReg.After(cutoff)) {
		return nil, ErrRespawnNotEligible
	}

	// Yeni sponsor aktif olmalı.
	var sponsorActive bool
	if err := q.QueryRow(ctx,
		`SELECT is_active FROM users WHERE id = $1`, newSponsorID).Scan(&sponsorActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSponsorNotFound
		}
		return nil, fmt.Errorf("sponsor okunamadı: %w", err)
	}
	if !sponsorActive {
		return nil, errors.New("sponsor aktif değil")
	}

	newCode, err := generateUniqueMemberCode(ctx, q)
	if err != nil {
		return nil, err
	}

	now := time.Now()

	// Eski üyeliği askıya al + e-posta/telefonu serbest bırak (yeni üyelik kullanacak).
	newEmail := email + ".suspended." + memberCode
	if _, err := q.Exec(ctx,
		`UPDATE users SET is_active = false, is_in_pending_pool = false, suspended_at = $1,
			email = $2, phone = NULL, updated_at = $1 WHERE id = $3`,
		now, newEmail, userID); err != nil {
		return nil, fmt.Errorf("eski üyelik askıya alınamadı: %w", err)
	}

	// Yeni üyeliği sıfırdan oluştur (şifre korunur, rol üye).
	var newUserID int64
	if err := q.QueryRow(ctx,
		`INSERT INTO users (name, email, phone, member_code, role, password_hash, sponsor_id,
			is_active, is_in_pending_pool, respawned_from_id)
		 VALUES ($1, $2, $3, $4, 'user', $5, $6, TRUE, FALSE, $7) RETURNING id`,
		name, email, phone, newCode, passwordHash, newSponsorID, userID).Scan(&newUserID); err != nil {
		return nil, fmt.Errorf("yeni üyelik oluşturulamadı: %w", err)
	}

	if _, err := q.Exec(ctx, `INSERT INTO wallets (user_id) VALUES ($1)`, newUserID); err != nil {
		return nil, fmt.Errorf("yeni cüzdan oluşturulamadı: %w", err)
	}

	oldID := userID
	if err := logInTx(ctx, q, adminID, adminName, "respawn", "user", &oldID,
		"yeniden üyelik", map[string]any{
			"new_user_id":    newUserID,
			"new_sponsor_id": newSponsorID,
			"old_code":       memberCode,
			"new_code":       newCode,
		}); err != nil {
		log.WithError(err).Warn("respawn denetim kaydı yazılamadı")
	}

	log.WithFields(log.Fields{
		"old_user_id": userID, "new_user_id": newUserID, "new_sponsor_id": newSponsorID,
	}).Info("Yeniden üyelik tamamlandı")

	return &models.User{
		ID:         newUserID,
		Name:       name,
		Email:      email,
		Phone:      phone,
		MemberCode: newCode,
		Role:       "user",
		SponsorID:  &newSponsorID,
		IsActive:   true,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// generateUniqueMemberCode DBTX üzerinde benzersiz TR90 üye kodu üretir.
func generateUniqueMemberCode(ctx context.Context, q DBTX) (string, error) {
	for attempt := 0; attempt < 20; attempt++ {
		code, err := randomMemberCode()
		if err != nil {
			return "", fmt.Errorf("üye kodu üretilemedi: %w", err)
		}
		var exists bool
		if err := q.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE member_code = $1)", code).Scan(&exists); err != nil {
			return "", fmt.Errorf("üye kodu kontrolü başarısız: %w", err)
		}
		if !exists {
			return code, nil
		}
	}
	return "", errors.New("benzersiz üye kodu üretilemedi")
}
