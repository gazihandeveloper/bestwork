package auth

import "testing"

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{name: "too short", password: "short12", wantErr: true},
		{name: "minimum length", password: "longpassword", wantErr: false},
		{name: "bcrypt byte limit", password: string(make([]byte, 73)), wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if gotErr := ValidatePassword(test.password) != nil; gotErr != test.wantErr {
				t.Fatalf("ValidatePassword() error = %v, wantErr %v", gotErr, test.wantErr)
			}
		})
	}
}
