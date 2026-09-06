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

const ticketColumns = `t.id, t.user_id, t.name, t.surname, t.phone, t.message, t.status, t.created_at, COALESCE(u.member_code, '') AS member_code`

// HasOpenTicket kullanıcının açık (open/new) talebi olup olmadığını döndürür.
func (s *TicketService) HasOpenTicket(ctx context.Context, userID int64) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tickets WHERE user_id = $1 AND status IN ('open','new'))`, userID).Scan(&exists)
	return exists, err
}

// UpdateStatus talebin durumunu günceller (resolved/closed).
func (s *TicketService) UpdateStatus(ctx context.Context, id int64, status string) error {
	_, err := s.db.Exec(ctx, `UPDATE tickets SET status = $1 WHERE id = $2`, status, id)
	return err
}

// CreateTicket yeni destek kaydı oluşturur.
func (s *TicketService) CreateTicket(ctx context.Context, userID *int64, name, surname, phone, message string) (*models.Ticket, error) {
	name = strings.TrimSpace(name)
	surname = strings.TrimSpace(surname)
	phone = strings.TrimSpace(phone)
	message = strings.TrimSpace(message)
	if name == "" || surname == "" || phone == "" || message == "" {
		return nil, fmt.Errorf("ad, soyad, telefon ve mesaj zorunludur")
	}

	if userID != nil {
		open, err := s.HasOpenTicket(ctx, *userID)
		if err != nil {
			return nil, fmt.Errorf("talep durumu kontrol edilemedi: %w", err)
		}
		if open {
			return nil, fmt.Errorf("Açık bir talebiniz var. Çözülmeden yeni talep oluşturamazsınız.")
		}
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

// ListByUser belirli bir kullanıcının destek taleplerini yeni→eski sırada döndürür.
func (s *TicketService) ListByUser(ctx context.Context, userID int64) ([]models.Ticket, error) {
	rows, err := s.db.Query(ctx, `SELECT `+ticketColumns+` FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.user_id = $1 ORDER BY t.id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("ticketlar listelenemedi: %w", err)
	}
	defer rows.Close()

	tickets := make([]models.Ticket, 0)
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Surname, &t.Phone, &t.Message, &t.Status, &t.CreatedAt, &t.MemberCode); err != nil {
			return nil, fmt.Errorf("ticket okunamadı: %w", err)
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}
// Get tek bir talebi döndürür.
func (s *TicketService) Get(ctx context.Context, id int64) (*models.Ticket, error) {
	var t models.Ticket
	err := s.db.QueryRow(ctx, `SELECT `+ticketColumns+` FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = $1`, id).
		Scan(&t.ID, &t.UserID, &t.Name, &t.Surname, &t.Phone, &t.Message, &t.Status, &t.CreatedAt, &t.MemberCode)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetByUser kullanıcının kendi talebini döndürür.
func (s *TicketService) GetByUser(ctx context.Context, id int64, userID int64) (*models.Ticket, error) {
	var t models.Ticket
	err := s.db.QueryRow(ctx, `SELECT `+ticketColumns+` FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = $1 AND t.user_id = $2`, id, userID).
		Scan(&t.ID, &t.UserID, &t.Name, &t.Surname, &t.Phone, &t.Message, &t.Status, &t.CreatedAt, &t.MemberCode)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// AppendMessage talebe yeni mesaj satırı ekler.
func (s *TicketService) AppendMessage(ctx context.Context, id int64, text string) (*models.Ticket, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return s.Get(ctx, id)
	}
	var cur string
	if err := s.db.QueryRow(ctx, `SELECT message FROM tickets WHERE id = $1`, id).Scan(&cur); err != nil {
		return nil, err
	}
	next := strings.TrimSpace(cur)
	if next != "" {
		next += "\n\n"
	}
	next += text
	if _, err := s.db.Exec(ctx, `UPDATE tickets SET message = $1, status = 'open' WHERE id = $2`, next, id); err != nil {
		return nil, err
	}
	return s.Get(ctx, id)
}

// ListAll tüm ticketları yeni→eski sırada döndürür (admin).
func (s *TicketService) ListAll(ctx context.Context) ([]models.Ticket, error) {
	rows, err := s.db.Query(ctx, `SELECT `+ticketColumns+` FROM tickets t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.id DESC`)
	if err != nil {
		return nil, fmt.Errorf("ticketlar listelenemedi: %w", err)
	}
	defer rows.Close()

	tickets := make([]models.Ticket, 0)
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Surname, &t.Phone, &t.Message, &t.Status, &t.CreatedAt, &t.MemberCode); err != nil {
			return nil, fmt.Errorf("ticket okunamadı: %w", err)
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}
