package services

import "math"

func moneyToCents(value float64) int64 {
	return int64(math.Round(value * 100))
}

func centsToMoney(cents int64) float64 {
	return float64(cents) / 100
}

func round2(value float64) float64 {
	return centsToMoney(moneyToCents(value))
}

func moneyEqual(left, right float64) bool {
	return moneyToCents(left) == moneyToCents(right)
}
