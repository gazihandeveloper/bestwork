package main

import (
	"fmt"
	"os"

	"mlm-backend/internal/auth"
)

func main() {
	password := os.Getenv("PASSWORD")
	if password == "" {
		fmt.Fprintln(os.Stderr, "PASSWORD ortam değişkeni zorunludur")
		os.Exit(1)
	}
	h, err := auth.HashPassword(password)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(h)
}
