package models

import "time"

// User veritabanındaki users tablosunun Go karşılığıdır.
// PasswordHash JSON çıktılarında hiçbir zaman görünmez.
type User struct {
	ID                       int64      `json:"id"`
	Name                     string     `json:"name"`
	Email                    string     `json:"email"`
	Phone                    *string    `json:"phone"`
	MemberCode               string     `json:"member_code"`
	Role                     string     `json:"role"`
	PasswordHash             string     `json:"-"`
	SponsorID                *int64     `json:"sponsor_id"`
	ParentID                 *int64     `json:"parent_id"`
	Position                 *string    `json:"position"`
	PackageID                *int       `json:"package_id"`
	IsActive                 bool       `json:"is_active"`
	IsInPendingPool          bool       `json:"is_in_pending_pool"`
	PendingSince             *time.Time `json:"pending_since"`
	CurrentRankID            *int       `json:"current_rank_id"`
	TotalPVLeft              int64      `json:"total_pv_left"`
	TotalPVRight             int64      `json:"total_pv_right"`
	TotalCVLeft              int64      `json:"total_cv_left"`
	TotalCVRight             int64      `json:"total_cv_right"`
	TotalPVAccumulated       int64      `json:"total_pv_accumulated"`
	TotalCVAccumulated       int64      `json:"total_cv_accumulated"`
	CurrentMonthBinaryEarned float64    `json:"current_month_binary_earned"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}
