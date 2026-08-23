package models

import "time"

// Ticket iletişim (destek) kaydının Go karşılığıdır.
type Ticket struct {
	ID        int64     `json:"id"`
	UserID    *int64    `json:"user_id"`
	Name      string    `json:"name"`
	Surname   string    `json:"surname"`
	Phone     string    `json:"phone"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
