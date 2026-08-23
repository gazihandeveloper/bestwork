package models

import "time"

// Product veritabanındaki products tablosunun Go karşılığıdır.
type Product struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Price       float64   `json:"price"`
	PV          int64     `json:"pv"`
	CV          int64     `json:"cv"`
	Stock       int       `json:"stock"`
	Description *string   `json:"description"`
	ImagePath   *string   `json:"image_path"`
	Category    *string   `json:"category"`
	SKU         *string   `json:"sku"`
	CreatedAt   time.Time `json:"created_at"`
}
