package main

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/config"
	"mlm-backend/internal/database"
	"mlm-backend/internal/services"
)

func main() {
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	if name == "" || email == "" || password == "" {
		fatal("ADMIN_NAME, ADMIN_EMAIL ve ADMIN_PASSWORD zorunludur")
	}
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		fatal("ADMIN_EMAIL geçerli bir e-posta adresi olmalıdır")
	}
	if err := auth.ValidatePassword(password); err != nil {
		fatal(err.Error())
	}

	if err := database.ConnectPostgres(config.LoadConfig()); err != nil {
		fatal(fmt.Sprintf("PostgreSQL bağlantısı kurulamadı: %v", err))
	}
	defer database.ClosePostgres()

	ctx := context.Background()
	users := services.NewUserService(database.GetDB())
	memberCode, err := users.GenerateMemberCode(ctx)
	if err != nil {
		fatal(err.Error())
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		fatal(err.Error())
	}

	tx, err := database.GetDB().Begin(ctx)
	if err != nil {
		fatal(fmt.Sprintf("transaction başlatılamadı: %v", err))
	}
	defer tx.Rollback(ctx)

	var userID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO users (name, email, member_code, role, password_hash, is_active, is_in_pending_pool)
		VALUES ($1, $2, $3, 'admin', $4, TRUE, FALSE)
		ON CONFLICT (email) DO NOTHING
		RETURNING id`, name, email, memberCode, hash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		fatal("bu e-posta adresiyle bir kullanıcı zaten var")
	}
	if err != nil {
		fatal(fmt.Sprintf("admin oluşturulamadı: %v", err))
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallets (user_id) VALUES ($1)`, userID); err != nil {
		fatal(fmt.Sprintf("admin cüzdanı oluşturulamadı: %v", err))
	}
	if err := tx.Commit(ctx); err != nil {
		fatal(fmt.Sprintf("transaction tamamlanamadı: %v", err))
	}

	fmt.Printf("Admin oluşturuldu: %s (%s)\n", email, memberCode)
}

func fatal(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
