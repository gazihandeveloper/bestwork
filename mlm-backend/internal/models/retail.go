package models

import "time"

// RetailEarningItem perakende kazanç detay kaydıdır.
type RetailEarningItem struct {
	CommissionID       int64     `json:"commission_id"`
	CustomerID         int64     `json:"customer_id"`
	CustomerName       string    `json:"customer_name"`
	CustomerMemberCode string    `json:"customer_member_code"`
	OrderID            *int64    `json:"order_id"`
	OrderAmount        *float64  `json:"order_amount"`
	RelatedCV          *int64    `json:"related_cv"`
	Amount             float64   `json:"amount"`
	CreatedAt          time.Time `json:"created_at"`
}

// RetailSummary perakende kazanç özetidir.
type RetailSummary struct {
	TotalAmount float64 `json:"total_amount"`
	OrderCount  int64   `json:"order_count"`
	TotalCV     int64   `json:"total_cv"`
}
