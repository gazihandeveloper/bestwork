package models

import "time"

// Wallet veritabanındaki wallets tablosunun Go karşılığıdır.
type Wallet struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	Balance        float64   `json:"balance"`
	TotalEarned    float64   `json:"total_earned"`
	TotalWithdrawn float64   `json:"total_withdrawn"`
	ChipBalance    float64   `json:"chip_balance"`
	UpdatedAt      time.Time `json:"updated_at"`
}
