package models

import "time"

// BinaryTransaction veritabanındaki binary_transactions tablosunun Go karşılığıdır.
// Kullanıcıların binary bacaklarındaki PV/CV hareketlerini tutar.
type BinaryTransaction struct {
	ID              int64     `json:"id"`
	UserID          int64     `json:"user_id"`
	Position        string    `json:"position"`
	TransactionType string    `json:"transaction_type"`
	PV              int64     `json:"pv"`
	CV              int64     `json:"cv"`
	Description     *string   `json:"description"`
	RelatedOrderID  *int64    `json:"related_order_id"`
	CreatedAt       time.Time `json:"created_at"`
}
