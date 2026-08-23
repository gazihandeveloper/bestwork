package models

import "time"

// HeroSlide ana sayfa slider kaydının Go karşılığıdır.
type HeroSlide struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Subtitle  *string   `json:"subtitle"`
	ImagePath string    `json:"image_path"`
	Link      *string   `json:"link"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}
