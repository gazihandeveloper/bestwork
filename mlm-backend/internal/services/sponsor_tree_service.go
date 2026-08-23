package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// SponsorTreeService sponsorluk ağacı görünümünü hazırlar.
type SponsorTreeService struct {
	db *pgxpool.Pool
}

// NewSponsorTreeService yeni bir SponsorTreeService örneği döndürür.
func NewSponsorTreeService(db *pgxpool.Pool) *SponsorTreeService {
	return &SponsorTreeService{db: db}
}

// GetSponsorTree belirtilen kullanıcının sponsorluk ağacını derinlik sınırlı döndürür.
// depth kökün altına inilecek seviye sayısıdır (0 = yalnız kök, max 5).
func (s *SponsorTreeService) GetSponsorTree(ctx context.Context, userID int64, depth int) (*models.SponsorTreeNode, error) {
	if depth < 0 {
		depth = 0
	}
	if depth > 5 {
		depth = 5
	}
	return s.buildSponsorTreeNode(ctx, userID, depth)
}

// buildSponsorTreeNode recursive olarak ağaç düğümü oluşturur.
func (s *SponsorTreeService) buildSponsorTreeNode(ctx context.Context, userID int64, depth int) (*models.SponsorTreeNode, error) {
	node := &models.SponsorTreeNode{}

	err := s.db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, u.member_code, u.role, u.package_id, COALESCE(p.name, ''),
			u.is_active, u.is_in_pending_pool, u.total_pv_accumulated
		FROM users u
		LEFT JOIN packages p ON p.id = u.package_id
		WHERE u.id = $1`, userID).
		Scan(&node.UserID, &node.Name, &node.Email, &node.MemberCode, &node.Role, &node.PackageID,
			&node.PackageName, &node.IsActive, &node.IsInPendingPool, &node.TotalPVAccumulated)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("ağaç düğümü okunamadı: %w", err)
	}

	// Doğrudan alt üye sayısı
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE sponsor_id = $1`, userID).Scan(&node.ChildCount); err != nil {
		return nil, fmt.Errorf("alt üye sayısı okunamadı: %w", err)
	}

	node.Children = make([]*models.SponsorTreeNode, 0)
	if depth <= 0 {
		return node, nil
	}

	rows, err := s.db.Query(ctx, `SELECT id FROM users WHERE sponsor_id = $1 ORDER BY id`, userID)
	if err != nil {
		return nil, fmt.Errorf("alt üyeler listelenemedi: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var childID int64
		if err := rows.Scan(&childID); err != nil {
			return nil, fmt.Errorf("alt üye okunamadı: %w", err)
		}

		child, err := s.buildSponsorTreeNode(ctx, childID, depth-1)
		if err != nil {
			return nil, err
		}
		node.Children = append(node.Children, child)
	}

	return node, rows.Err()
}
