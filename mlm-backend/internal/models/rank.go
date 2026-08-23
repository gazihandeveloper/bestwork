package models

import "time"

// Rank veritabanındaki ranks tablosunun Go karşılığıdır.
type Rank struct {
	ID                 int       `json:"id"`
	Name               string    `json:"name"`
	RequiredLeftPV     int64     `json:"required_left_pv"`
	RequiredRightPV    int64     `json:"required_right_pv"`
	MonthlyBinaryLimit float64   `json:"monthly_binary_limit"`
	CreatedAt          time.Time `json:"created_at"`
}
