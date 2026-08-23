package models

import "time"

// PaymentNotification veritabanındaki payment_notifications tablosunun Go karşılığıdır.
// Kullanıcıların EFT/HAVALE ile yaptıkları ödemeleri bildirmek için oluşturdukları kayıtlardır.
type PaymentNotification struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	OrderID     *int64     `json:"order_id"`
	Amount      float64    `json:"amount"`
	BankName    *string    `json:"bank_name"`
	ReferenceNo *string    `json:"reference_no"`
	Note        *string    `json:"note"`
	FilePath    *string    `json:"file_path"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	ProcessedAt *time.Time `json:"processed_at"`
	ProcessedBy *int64     `json:"processed_by"`
}
