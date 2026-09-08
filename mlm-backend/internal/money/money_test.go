package money

import "testing"

func TestCentsFromTL(t *testing.T) {
	cases := []struct {
		tl   float64
		want int64
	}{
		{855.00, 85500},
		{29.99, 2999},
		{0.10, 10},
		{1234.56, 123456},
		{1000000.00, 100000000},
		{-5.50, -550},
	}
	for _, c := range cases {
		got := CentsFromTL(c.tl)
		if got != c.want {
			t.Errorf("CentsFromTL(%v) = %d; want %d", c.tl, got, c.want)
		}
	}
}

func TestTLFromCents(t *testing.T) {
	if got := TLFromCents(85500); got != 855.00 {
		t.Errorf("TLFromCents(85500) = %v; want 855", got)
	}
	if got := TLFromCents(2999); got != 29.99 {
		t.Errorf("TLFromCents(2999) = %v; want 29.99", got)
	}
}
