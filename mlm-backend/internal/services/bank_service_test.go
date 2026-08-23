package services

import "testing"

func TestIBANValidation(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{input: "TR33 0006 1005 1978 6457 8413 26", valid: true},
		{input: "GB82 WEST 1234 5698 7654 32", valid: true},
		{input: "TR33 0006 1005 1978 6457 8413 27", valid: false},
		{input: "XXXX", valid: false},
	}

	for _, test := range tests {
		if got := isValidIBAN(normalizeIBAN(test.input)); got != test.valid {
			t.Errorf("isValidIBAN(%q) = %v, want %v", test.input, got, test.valid)
		}
	}
}
