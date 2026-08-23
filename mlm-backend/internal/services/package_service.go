package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// ErrPackageNotFound paket bulunamadığında döner.
var ErrPackageNotFound = errors.New("paket bulunamadı")

// DBTX pgxpool.Pool ve pgx.Tx'in ortak arayüzüdür; böylece
// yardımcı fonksiyonlar transaction içinde de çalışabilir.
type DBTX interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

// GetAllPackages tüm paketleri required_pv'ye göre artan sırada döndürür.
func GetAllPackages(ctx context.Context, q DBTX) ([]models.Package, error) {
	rows, err := q.Query(ctx, `SELECT id, name, price, referral_bonus_rate, binary_bonus_rate,
		matching_bonus_rate, discount_rate, required_pv, created_at
		FROM packages ORDER BY required_pv ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	packages := make([]models.Package, 0)
	for rows.Next() {
		var p models.Package
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.ReferralBonusRate, &p.BinaryBonusRate,
			&p.MatchingBonusRate, &p.DiscountRate, &p.RequiredPV, &p.CreatedAt); err != nil {
			return nil, err
		}
		packages = append(packages, p)
	}
	return packages, rows.Err()
}

// UpdatePackageLevel kullanıcının toplam PV birikimine göre ulaştığı en yüksek
// paketi belirler; mevcut paketten farklıysa günceller.
func UpdatePackageLevel(ctx context.Context, q DBTX, userID int64, totalPV int64) error {
	packages, err := GetAllPackages(ctx, q)
	if err != nil {
		return err
	}

	// Eşiği geçilen en yüksek paketi bul
	var newPackage *models.Package
	for i := range packages {
		if packages[i].RequiredPV > 0 && totalPV >= packages[i].RequiredPV {
			newPackage = &packages[i]
		}
	}

	var currentPackageID *int
	if err := q.QueryRow(ctx, `SELECT package_id FROM users WHERE id = $1`, userID).Scan(&currentPackageID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return err
	}

	// Ulaşılan paket yoksa veya değişiklik yoksa dokunma
	if newPackage == nil {
		return nil
	}
	if currentPackageID != nil && *currentPackageID == newPackage.ID {
		return nil
	}

	if _, err := q.Exec(ctx, `UPDATE users SET package_id = $1, updated_at = NOW() WHERE id = $2`,
		newPackage.ID, userID); err != nil {
		return err
	}

	log.WithFields(log.Fields{
		"user_id":  userID,
		"package":  newPackage.Name,
		"total_pv": totalPV,
	}).Info("Paket seviyesi güncellendi")

	return nil
}

// PackageService paket CRUD işlemlerini yürütür (admin).
type PackageService struct {
	db *pgxpool.Pool
}

// NewPackageService yeni bir PackageService örneği döndürür.
func NewPackageService(db *pgxpool.Pool) *PackageService {
	return &PackageService{db: db}
}

const packageColumns = `id, name, price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate, discount_rate, required_pv, created_at`

// CreatePackage yeni paket ekler.
func (s *PackageService) CreatePackage(ctx context.Context, name string, price, refRate, binRate, matchRate, discRate float64, requiredPV int64) (*models.Package, error) {
	if name == "" || price <= 0 || requiredPV < 0 || !validRate(refRate) || !validRate(binRate) || !validRate(matchRate) || !validRate(discRate) {
		return nil, errors.New("geçersiz paket bilgileri")
	}

	p := &models.Package{
		Name:              name,
		Price:             price,
		ReferralBonusRate: refRate,
		BinaryBonusRate:   binRate,
		MatchingBonusRate: matchRate,
		DiscountRate:      discRate,
		RequiredPV:        requiredPV,
	}
	err := s.db.QueryRow(ctx,
		`INSERT INTO packages (name, price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate, discount_rate, required_pv)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		p.Name, p.Price, p.ReferralBonusRate, p.BinaryBonusRate, p.MatchingBonusRate, p.DiscountRate, p.RequiredPV).
		Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("paket eklenemedi: %w", err)
	}
	return p, nil
}

// GetPackageByID ID'ye göre paketi döndürür.
func (s *PackageService) GetPackageByID(ctx context.Context, id int) (*models.Package, error) {
	var p models.Package
	err := s.db.QueryRow(ctx, `SELECT `+packageColumns+` FROM packages WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.Price, &p.ReferralBonusRate, &p.BinaryBonusRate, &p.MatchingBonusRate, &p.DiscountRate, &p.RequiredPV, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPackageNotFound
		}
		return nil, fmt.Errorf("paket okunamadı: %w", err)
	}
	return &p, nil
}

// ListPackages tüm paketleri döndürür.
func (s *PackageService) ListPackages(ctx context.Context) ([]models.Package, error) {
	rows, err := s.db.Query(ctx, `SELECT `+packageColumns+` FROM packages ORDER BY required_pv ASC`)
	if err != nil {
		return nil, fmt.Errorf("paketler listelenemedi: %w", err)
	}
	defer rows.Close()

	packages := make([]models.Package, 0)
	for rows.Next() {
		var p models.Package
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.ReferralBonusRate, &p.BinaryBonusRate, &p.MatchingBonusRate, &p.DiscountRate, &p.RequiredPV, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("paket okunamadı: %w", err)
		}
		packages = append(packages, p)
	}
	return packages, rows.Err()
}

// UpdatePackage paketin tüm değişebilir alanlarını günceller.
func (s *PackageService) UpdatePackage(ctx context.Context, p *models.Package) error {
	if p.Name == "" || p.Price <= 0 || p.RequiredPV < 0 || !validRate(p.ReferralBonusRate) || !validRate(p.BinaryBonusRate) || !validRate(p.MatchingBonusRate) || !validRate(p.DiscountRate) {
		return errors.New("geçersiz paket bilgileri")
	}
	tag, err := s.db.Exec(ctx,
		`UPDATE packages SET name = $1, price = $2, referral_bonus_rate = $3, binary_bonus_rate = $4,
			matching_bonus_rate = $5, discount_rate = $6, required_pv = $7 WHERE id = $8`,
		p.Name, p.Price, p.ReferralBonusRate, p.BinaryBonusRate, p.MatchingBonusRate, p.DiscountRate, p.RequiredPV, p.ID)
	if err != nil {
		return fmt.Errorf("paket güncellenemedi: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPackageNotFound
	}
	return nil
}

func validRate(rate float64) bool {
	return rate >= 0 && rate <= 1
}

// DeletePackage paketi siler (kullanıcılar tarafından referans ediliyorsa hata döner).
func (s *PackageService) DeletePackage(ctx context.Context, id int) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM packages WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("paket silinemedi (kullanıcılar bu paketi referans ediyor olabilir): %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPackageNotFound
	}
	return nil
}
