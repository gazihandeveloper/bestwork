package services

import "testing"

func TestMoneyHelpers(t *testing.T) {
	if got := centsToMoney(moneyToCents(10.005)); got != 10.01 {
		t.Fatalf("rounding = %.2f, want 10.01", got)
	}
	if !moneyEqual(100.0, 99.9999) {
		t.Fatal("aynı kuruş değerleri eşit sayılmadı")
	}
	if moneyEqual(100.0, 99.98) {
		t.Fatal("farklı kuruş değerleri eşit sayıldı")
	}
}
