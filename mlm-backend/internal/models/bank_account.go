package models

import "time"

// BankAccount veritabanındaki bank_accounts tablosunun Go karşılığıdır.
type BankAccount struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	BankName    string    `json:"bank_name"`
	IBAN        string    `json:"iban"`
	AccountName string    `json:"account_name"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
