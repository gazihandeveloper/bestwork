package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// TicketService iletişim (ticket) kayıtlarını yönetir.
type TicketService struct {
	db *pgxpool.Pool
}

// NewTicketService yeni bir TicketService örneği döndürür.
func NewTicketService(db *pgxpool.Pool) *TicketService {
	return &TicketService{db: db}
}

const ticketColumns = `id, user_id, name, surname, phone, message, status, created_at`

// CreateTicket yeni destek kaydı oluşturur.
func (s *TicketService) CreateTicket(ctx context.Context, userID *int64, name, surname, phone, message string) (*models.Ticket, error) {
	name = strings.TrimSpace(name)
	surname = strings.TrimSpace(surname)
	phone = strings.TrimSpace(phone)
	message = strings.TrimSpace(message)
	if name == "" || surname == "" || phone == "" || message == "" {
		return nil, fmt.Errorf("ad, soyad, telefon ve mesaj zorunludur")
	}

	t := &models.Ticket{
		UserID:  userID,
		Name:    name,
		Surname: surname,
		Phone:   phone,
		Message: message,
		Status:  "open",
	}

	err := s.db.QueryRow(ctx,
		`INSERT INTO tickets (user_id, name, surname, phone, message)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, status, created_at`,
		t.UserID, t.Name, t.Surname, t.Phone, t.Message).
		Scan(&t.ID, &t.Status, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ticket kaydedilemedi: %w", err)
	}
	return t, nil
}

// ListAll tüm ticketları yeni→eski sırada döndürür (admin).
func (s *TicketService) ListAll(ctx context.Context) ([]models.Ticket, error) {
	rows, err := s.db.Query(ctx, `SELECT `+ticketColumns+` FROM tickets ORDER BY id DESC`)
	if err != nil {
		return nil, fmt.Errorf("ticketlar listelenemedi: %w", err)
	}
	defer rows.Close()

	tickets := make([]models.Ticket, 0)
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Surname, &t.Phone, &t.Message, &t.Status, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("ticket okunamadı: %w", err)
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}
