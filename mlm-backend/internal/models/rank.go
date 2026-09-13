package models

import "time"

// Rank veritabanındaki ranks tablosunun Go karşılığıdır.
type Rank struct {
	ID                     int       `json:"id"`
	Name                   string    `json:"name"`
	RequiredLeftPV         float64     `json:"required_left_pv"`
	RequiredRightPV        float64     `json:"required_right_pv"`
	MonthlyBinaryLimit     float64   `json:"monthly_binary_limit"`
	RequiredDownlineRankID *int      `json:"required_downline_rank_id"`
	RequiredDownlineCount  int       `json:"required_downline_count"`
	PersonalActivityPV     float64     `json:"personal_activity_pv"`
	CareerBonusAmount      float64   `json:"career_bonus_amount"`
	CreatedAt              time.Time `json:"created_at"`
}
