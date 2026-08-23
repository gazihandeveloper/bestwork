package models

import "time"

// WithdrawRequest veritabanındaki withdraw_requests tablosunun Go karşılığıdır.
type WithdrawRequest struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	Amount      float64    `json:"amount"`
	Method      *string    `json:"method"`
	Status      string     `json:"status"`
	RequestedAt time.Time  `json:"requested_at"`
	ProcessedAt *time.Time `json:"processed_at"`
}
