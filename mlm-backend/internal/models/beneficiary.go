package models

import "time"

// Beneficiary veritabanındaki beneficiaries tablosunun Go karşılığıdır.
type Beneficiary struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	FullName     string    `json:"full_name"`
	Relationship string    `json:"relationship"`
	Phone        *string   `json:"phone"`
	Email        *string   `json:"email"`
	CreatedAt    time.Time `json:"created_at"`
}
