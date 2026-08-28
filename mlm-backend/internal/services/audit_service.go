package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// AuditService admin denetim loglarını yönetir. Log kayıtları silinemez;
// yalnızca eklenir ve okunur.
type AuditService struct {
	db *pgxpool.Pool
}

// NewAuditService yeni bir AuditService örneği döndürür.
func NewAuditService(db *pgxpool.Pool) *AuditService {
	return &AuditService{db: db}
}

// Log bir admin işlemini denetim kaydına yazar. adminName kullanıcı
// tablosundan çözülür; admin silinmiş olsa bile kayıt yazılmaya devam eder.
func (s *AuditService) Log(ctx context.Context, adminID int64, action, targetType string, targetID *int64, reason string, meta map[string]any) error {
	var adminName string
	// Admin silinmiş olabilir; ad çözülemese de kayıt yazılır.
	_ = s.db.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, adminID).Scan(&adminName)

	var reasonPtr *string
	if reason != "" {
		r := reason
		reasonPtr = &r
	}

	metaJSON := []byte("{}")
	if meta != nil {
		if b, err := json.Marshal(meta); err == nil {
			metaJSON = b
		}
	}

	if _, err := s.db.Exec(ctx, `
		INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, reason, meta)
		VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7)`,
		adminID, adminName, action, targetType, targetID, reasonPtr, metaJSON); err != nil {
		return fmt.Errorf("denetim kaydı yazılamadı: %w", err)
	}
	return nil
}

// logInTx transaction içinde denetim kaydı yazar (bakiye işlemleri gibi
// atomik işlemlerle birlikte commit edilir).
func logInTx(ctx context.Context, q DBTX, adminID int64, adminName, action, targetType string, targetID *int64, reason string, meta map[string]any) error {
	var metaJSON []byte = []byte("{}")
	if meta != nil {
		if b, err := json.Marshal(meta); err == nil {
			metaJSON = b
		}
	}
	var reasonPtr *string
	if reason != "" {
		r := reason
		reasonPtr = &r
	}
	if _, err := q.Exec(ctx, `
		INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, reason, meta)
		VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7)`,
		adminID, adminName, action, targetType, targetID, reasonPtr, metaJSON); err != nil {
		return fmt.Errorf("denetim kaydı yazılamadı: %w", err)
	}
	return nil
}

const auditColumns = `id, admin_id, admin_name, action, target_type, target_id, reason, meta, created_at`

// List denetim kayıtlarını sayfalı döndürür; action verilirse yalnızca o
// eylem tipi filtrelenir. correctionActions'ta olanlar düzeltme loglarıdır.
func (s *AuditService) List(ctx context.Context, limit, offset int, action string) ([]models.AuditLog, int64, error) {
	where := ""
	args := make([]any, 0, 3)
	if action != "" {
		where = ` WHERE action = $1`
		args = append(args, action)
	}

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("denetim kaydı sayılamadı: %w", err)
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(`SELECT %s FROM audit_logs%s ORDER BY id DESC LIMIT $%d OFFSET $%d`,
		auditColumns, where, len(args)-1, len(args))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("denetim kayıtları listelenemedi: %w", err)
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.AdminID, &l.AdminName, &l.Action, &l.TargetType, &l.TargetID, &l.Reason, &l.Meta, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("denetim kaydı okunamadı: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}

// correctionActions puan/bakiye düzeltmesi sayılan eylem tipleridir.
var correctionActions = []string{"wallet_adjust", "rank_update", "tree_move", "pv_adjust", "bonus_rollback"}

// ListCorrections düzeltme (rollback/clawback vb.) loglarını döndürür.
func (s *AuditService) ListCorrections(ctx context.Context, limit, offset int) ([]models.AuditLog, int64, error) {
	rows, err := s.db.Query(ctx, `
		SELECT `+auditColumns+` FROM audit_logs
		WHERE action = ANY($1)
		ORDER BY id DESC LIMIT $2 OFFSET $3`, correctionActions, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("düzeltme logları listelenemedi: %w", err)
	}
	defer rows.Close()

	var total int64
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM audit_logs WHERE action = ANY($1)`, correctionActions).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("düzeltme logları sayılamadı: %w", err)
	}

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.AdminID, &l.AdminName, &l.Action, &l.TargetType, &l.TargetID, &l.Reason, &l.Meta, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("düzeltme kaydı okunamadı: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}
