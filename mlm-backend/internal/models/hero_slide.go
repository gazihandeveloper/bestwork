package models

import "time"

// HeroSlide ana sayfa slider kaydının Go karşılığıdır.
type HeroSlide struct {
	ID                   int64     `json:"id"`
	Title                string    `json:"title"`
	Subtitle             *string   `json:"subtitle"`
	Description          *string   `json:"description"`
	ImagePath            string    `json:"image_path"`
	Link                 *string   `json:"link"`
	PrimaryButtonText    *string   `json:"primary_button_text"`
	PrimaryButtonLink    *string   `json:"primary_button_link"`
	SecondaryButtonText  *string   `json:"secondary_button_text"`
	SecondaryButtonLink  *string   `json:"secondary_button_link"`
	ShowButtons          bool      `json:"show_buttons"`
	SortOrder            int       `json:"sort_order"`
	IsActive             bool      `json:"is_active"`
	CreatedAt            time.Time `json:"created_at"`
}
