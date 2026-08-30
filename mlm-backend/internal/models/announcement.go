package models

import "time"

// Announcement duyuru/bildirim kaydıdır.
type Announcement struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Audience  string    `json:"audience"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}
