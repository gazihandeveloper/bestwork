package money

import "math"

// CentsFromTL: TL (float) degerini krusa (int64) cevirir (banker-agzi yuvarlama: math.Round).
// Standart donusum noktasi - eshop ve para akislari buradan gecer.
// Ornek: 855.00 -> 85500, 29.99 -> 2999
func CentsFromTL(tl float64) int64 {
	return int64(math.Round(tl * 100))
}

// TLFromCents: krus (int64) degerini TL (float) olarak dondurur (goruntuleme icin).
func TLFromCents(c int64) float64 {
	return float64(c) / 100
}
