package models

import "time"

// EarningPlan, kazanç planı kalemidir (Network Ayarları).
type EarningPlan struct {
	ID            int64     `json:"id"`
	Code          string    `json:"code"`
	Title         string    `json:"title"`
	Description   *string   `json:"description"`
	PayoutType    string    `json:"payout_type"`    // gelir | puan | bonus
	MaxRate       float64   `json:"max_rate"`       // %
	Scope         string    `json:"scope"`          // product | tree
	Period        string    `json:"period"`         // daily | weekly | monthly
	ActivityMode  string    `json:"activity_mode"`  // none | personal | team
	CheckMatching bool      `json:"check_matching"` // eşleşmeye dahil mi
	Depth         int       `json:"depth"`
	SortOrder     int       `json:"sort_order"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	Rates         []EarningPlanRate `json:"rates,omitempty"`
}

// EarningPlanRate, bir kazanç kaleminin kariyer × derinlik oranıdır.
type EarningPlanRate struct {
	ID     int64   `json:"id,omitempty"`
	PlanID int64   `json:"plan_id,omitempty"`
	RankID int64   `json:"rank_id"`
	Depth  int     `json:"depth"`
	Rate   float64 `json:"rate"`
}
