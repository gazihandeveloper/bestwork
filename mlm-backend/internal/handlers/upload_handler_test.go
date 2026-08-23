package handlers

import (
	"bytes"
	"testing"
)

func TestValidateUploadType(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		content  []byte
		wantErr  bool
	}{
		{name: "jpeg", filename: "receipt.jpg", content: []byte{0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'J', 'F', 'I', 'F'}, wantErr: false},
		{name: "pdf", filename: "receipt.pdf", content: []byte("%PDF-1.7\n"), wantErr: false},
		{name: "fake jpeg", filename: "payload.jpg", content: []byte("not an image"), wantErr: true},
		{name: "wrong extension", filename: "receipt.exe", content: []byte("%PDF-1.7\n"), wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := validateUploadType(test.filename, bytes.NewReader(test.content))
			if gotErr := err != nil; gotErr != test.wantErr {
				t.Fatalf("validateUploadType() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}
