package models

import "time"

// Setting veritabanındaki settings tablosunun Go karşılığıdır (key/value).
type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}
