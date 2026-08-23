package models

import "time"

// CareerProgress kullanıcının rütbe ilerleme kayıtlarını tutar.
type CareerProgress struct {
	RankID     int       `json:"rank_id"`
	RankName   string    `json:"rank_name"`
	AchievedAt time.Time `json:"achieved_at"`
	IsActive   bool      `json:"is_active"`
}
