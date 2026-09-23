package models

import "time"

// Tax, vergi tanımıdır (ör. KDV %20). Fiyatlar KDV hariçtir; vergi siparişte eklenir.
type Tax struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Rate      float64   `json:"rate"`
	SortOrder int       `json:"sort_order"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
