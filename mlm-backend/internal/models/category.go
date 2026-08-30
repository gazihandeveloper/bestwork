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
	CreatedAt   time.Time `json:"created_at"`
}
