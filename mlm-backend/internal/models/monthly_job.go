package models

import "time"

// MonthlyJob veritabanındaki monthly_jobs tablosunun Go karşılığıdır.
// Aylık işlerin idempotency kayıtlarını tutar.
type MonthlyJob struct {
	ID         int64     `json:"id"`
	JobType    string    `json:"job_type"`
	JobMonth   string    `json:"job_month"`
	ExecutedAt time.Time `json:"executed_at"`
}
