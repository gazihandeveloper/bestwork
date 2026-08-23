package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// ErrBankAccountNotFound banka hesabı bulunamadığında döner.
var ErrBankAccountNotFound = errors.New("banka hesabı bulunamadı")

// BankService banka hesabı işlemlerini yürütür.
type BankService struct {
	db *pgxpool.Pool
}

// NewBankService yeni bir BankService örneği döndürür.
func NewBankService(db *pgxpool.Pool) *BankService {
	return &BankService{db: db}
}

const bankAccountColumns = `id, user_id, bank_name, iban, account_name, is_active, created_at, updated_at`

// CreateBankAccount yeni banka hesabı ekler.
func (s *BankService) CreateBankAccount(ctx context.Context, userID int64, bankName, iban, accountName string) (*models.BankAccount, error) {
	bankName = strings.TrimSpace(bankName)
	iban = normalizeIBAN(iban)
	accountName = strings.TrimSpace(accountName)
	if bankName == "" || iban == "" || accountName == "" {
		return nil, errors.New("banka adı, IBAN ve hesap sahibi zorunludur")
	}
	if !isValidIBAN(iban) {
		return nil, errors.New("geçersiz IBAN")
	}

	ba := &models.BankAccount{
		UserID:      userID,
		BankName:    bankName,
		IBAN:        iban,
		AccountName: accountName,
		IsActive:    true,
	}
	err := s.db.QueryRow(ctx,
		`INSERT INTO bank_accounts (user_id, bank_name, iban, account_name)
		 VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at`,
		ba.UserID, ba.BankName, ba.IBAN, ba.AccountName).Scan(&ba.ID, &ba.CreatedAt, &ba.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("banka hesabı eklenemedi: %w", err)
	}
	return ba, nil
}

// ListBankAccountsByUser kullanıcının banka hesaplarını döndürür.
func (s *BankService) ListBankAccountsByUser(ctx context.Context, userID int64) ([]models.BankAccount, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+bankAccountColumns+` FROM bank_accounts WHERE user_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("banka hesapları listelenemedi: %w", err)
	}
	defer rows.Close()

	accounts := make([]models.BankAccount, 0)
	for rows.Next() {
		var ba models.BankAccount
		if err := rows.Scan(&ba.ID, &ba.UserID, &ba.BankName, &ba.IBAN, &ba.AccountName, &ba.IsActive, &ba.CreatedAt, &ba.UpdatedAt); err != nil {
			return nil, fmt.Errorf("banka hesabı okunamadı: %w", err)
		}
		accounts = append(accounts, ba)
	}
	return accounts, rows.Err()
}

// GetBankAccountByID ID'ye göre banka hesabını döndürür.
func (s *BankService) GetBankAccountByID(ctx context.Context, id int64) (*models.BankAccount, error) {
	var ba models.BankAccount
	err := s.db.QueryRow(ctx, `SELECT `+bankAccountColumns+` FROM bank_accounts WHERE id = $1`, id).
		Scan(&ba.ID, &ba.UserID, &ba.BankName, &ba.IBAN, &ba.AccountName, &ba.IsActive, &ba.CreatedAt, &ba.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBankAccountNotFound
		}
		return nil, fmt.Errorf("banka hesabı okunamadı: %w", err)
	}
	return &ba, nil
}

// UpdateBankAccount banka hesabını günceller.
func (s *BankService) UpdateBankAccount(ctx context.Context, accountID int64, bankName, iban, accountName string) error {
	bankName = strings.TrimSpace(bankName)
	iban = normalizeIBAN(iban)
	accountName = strings.TrimSpace(accountName)
	if bankName == "" || accountName == "" || !isValidIBAN(iban) {
		return errors.New("geçersiz banka hesabı bilgileri")
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE bank_accounts SET bank_name = $1, iban = $2, account_name = $3, updated_at = NOW() WHERE id = $4`,
		bankName, iban, accountName, accountID)
	if err != nil {
		return fmt.Errorf("banka hesabı güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBankAccountNotFound
	}
	return nil
}

func normalizeIBAN(iban string) string {
	return strings.ToUpper(strings.Join(strings.Fields(iban), ""))
}

func isValidIBAN(iban string) bool {
	if len(iban) < 15 || len(iban) > 34 {
		return false
	}
	if iban[0] < 'A' || iban[0] > 'Z' || iban[1] < 'A' || iban[1] > 'Z' ||
		iban[2] < '0' || iban[2] > '9' || iban[3] < '0' || iban[3] > '9' {
		return false
	}

	rearranged := iban[4:] + iban[:4]
	remainder := 0
	for _, char := range rearranged {
		switch {
		case char >= '0' && char <= '9':
			remainder = (remainder*10 + int(char-'0')) % 97
		case char >= 'A' && char <= 'Z':
			value := int(char-'A') + 10
			remainder = (remainder*10 + value/10) % 97
			remainder = (remainder*10 + value%10) % 97
		default:
			return false
		}
	}
	return remainder == 1
}

// DeleteBankAccount banka hesabını pasife alır (yumuşak silme).
func (s *BankService) DeleteBankAccount(ctx context.Context, accountID int64) error {
	tag, err := s.db.Exec(ctx,
		`UPDATE bank_accounts SET is_active = false, updated_at = NOW() WHERE id = $1`, accountID)
	if err != nil {
		return fmt.Errorf("banka hesabı silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBankAccountNotFound
	}
	return nil
}
