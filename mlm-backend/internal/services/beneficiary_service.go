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

// ErrBeneficiaryNotFound varis bulunamadığında döner.
var ErrBeneficiaryNotFound = errors.New("varis bulunamadı")

// BeneficiaryService varis bilgisi işlemlerini yürütür.
type BeneficiaryService struct {
	db *pgxpool.Pool
}

// NewBeneficiaryService yeni bir BeneficiaryService örneği döndürür.
func NewBeneficiaryService(db *pgxpool.Pool) *BeneficiaryService {
	return &BeneficiaryService{db: db}
}

const beneficiaryColumns = `id, user_id, full_name, relationship, phone, email, created_at`

// CreateBeneficiary yeni varis ekler.
func (s *BeneficiaryService) CreateBeneficiary(ctx context.Context, userID int64, fullName, relationship, phone, email string) (*models.Beneficiary, error) {
	fullName = strings.TrimSpace(fullName)
	relationship = strings.TrimSpace(relationship)
	if fullName == "" || relationship == "" {
		return nil, errors.New("ad soyad ve yakınlık derecesi zorunludur")
	}

	var phonePtr, emailPtr *string
	if p := strings.TrimSpace(phone); p != "" {
		phonePtr = &p
	}
	if e := strings.TrimSpace(email); e != "" {
		emailPtr = &e
	}

	b := &models.Beneficiary{
		UserID:       userID,
		FullName:     fullName,
		Relationship: relationship,
		Phone:        phonePtr,
		Email:        emailPtr,
	}
	err := s.db.QueryRow(ctx,
		`INSERT INTO beneficiaries (user_id, full_name, relationship, phone, email)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		b.UserID, b.FullName, b.Relationship, b.Phone, b.Email).Scan(&b.ID, &b.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("varis eklenemedi: %w", err)
	}
	return b, nil
}

// ListBeneficiariesByUser kullanıcının varislerini döndürür.
func (s *BeneficiaryService) ListBeneficiariesByUser(ctx context.Context, userID int64) ([]models.Beneficiary, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+beneficiaryColumns+` FROM beneficiaries WHERE user_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("varisler listelenemedi: %w", err)
	}
	defer rows.Close()

	beneficiaries := make([]models.Beneficiary, 0)
	for rows.Next() {
		var b models.Beneficiary
		if err := rows.Scan(&b.ID, &b.UserID, &b.FullName, &b.Relationship, &b.Phone, &b.Email, &b.CreatedAt); err != nil {
			return nil, fmt.Errorf("varis okunamadı: %w", err)
		}
		beneficiaries = append(beneficiaries, b)
	}
	return beneficiaries, rows.Err()
}

// GetBeneficiaryByID ID'ye göre varisi döndürür.
func (s *BeneficiaryService) GetBeneficiaryByID(ctx context.Context, id int64) (*models.Beneficiary, error) {
	var b models.Beneficiary
	err := s.db.QueryRow(ctx, `SELECT `+beneficiaryColumns+` FROM beneficiaries WHERE id = $1`, id).
		Scan(&b.ID, &b.UserID, &b.FullName, &b.Relationship, &b.Phone, &b.Email, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBeneficiaryNotFound
		}
		return nil, fmt.Errorf("varis okunamadı: %w", err)
	}
	return &b, nil
}

// DeleteBeneficiary varisi siler.
func (s *BeneficiaryService) DeleteBeneficiary(ctx context.Context, beneficiaryID int64) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM beneficiaries WHERE id = $1`, beneficiaryID)
	if err != nil {
		return fmt.Errorf("varis silinemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrBeneficiaryNotFound
	}
	return nil
}
