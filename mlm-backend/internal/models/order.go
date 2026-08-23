package models

import "time"

// Order veritabanındaki orders tablosunun Go karşılığıdır.
type Order struct {
	ID            int64       `json:"id"`
	UserID        int64       `json:"user_id"`
	TotalAmount   float64     `json:"total_amount"`
	TotalPV       int64       `json:"total_pv"`
	TotalCV       int64       `json:"total_cv"`
	Status        string      `json:"status"`
	PaymentMethod string      `json:"payment_method"`
	CreatedAt     time.Time   `json:"created_at"`
	Items         []OrderItem `json:"items"`
}
