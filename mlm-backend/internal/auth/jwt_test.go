package auth

import "testing"

func TestInitSecretRejectsWeakSecret(t *testing.T) {
	if err := InitSecret("supersecretkey"); err == nil {
		t.Fatal("zayıf JWT sırrı kabul edildi")
	}
}

func TestInitSecretAcceptsStrongSecret(t *testing.T) {
	if err := InitSecret("0123456789abcdef0123456789abcdef"); err != nil {
		t.Fatalf("güçlü JWT sırrı reddedildi: %v", err)
	}
}