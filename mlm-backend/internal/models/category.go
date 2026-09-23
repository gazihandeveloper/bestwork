package models

import "time"

// Category mağaza kategorileri tablosunun Go karşılığıdır.
type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Slug        *string   `json:"slug"`
	Icon        string    `json:"icon"`
	Description *string   `json:"description"`
	SortOrder   int       `json:"sort_order"`
	IsActive    bool      `json:"is_active"`
	TaxID       *int64    `json:"tax_id"`
	TaxTitle    *string   `json:"tax_title,omitempty"`
	TaxRate     float64   `json:"tax_rate"`
	CreatedAt   time.Time `json:"created_at"`
}
