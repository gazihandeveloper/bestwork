package models

// OrderItem veritabanındaki order_items tablosunun Go karşılığıdır.
type OrderItem struct {
	ID        int64   `json:"id"`
	OrderID   int64   `json:"order_id"`
	ProductID *int64  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	PV        int64   `json:"pv"`
	CV        int64   `json:"cv"`
}
