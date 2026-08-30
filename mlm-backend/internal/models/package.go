package models

import "time"

// Package veritabanındaki packages tablosunun Go karşılığıdır.
type Package struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	Price             float64   `json:"price"`
	ReferralBonusRate float64   `json:"referral_bonus_rate"`
	BinaryBonusRate   float64   `json:"binary_bonus_rate"`
	MatchingBonusRate float64   `json:"matching_bonus_rate"`
	DiscountRate      float64   `json:"discount_rate"`
	RequiredPV        int64     `json:"required_pv"`
	CV                int64     `json:"cv"`
	CreatedAt         time.Time `json:"created_at"`
}
