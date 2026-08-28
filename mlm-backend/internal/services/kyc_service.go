package services

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// KYCService kimlik doğrulama belgelerini yönetir (admin kuyruğu + onay/red).
type KYCService struct {
	db *pgxpool.Pool
}

// NewKYCService yeni bir KYCService örneği döndürür.
func NewKYCService(db *pgxpool.Pool) *KYCService {
	return &KYCService{db: db}
}

const kycColumns = `k.id, k.user_id, u.name, u.member_code, k.document_type, k.file_path, k.status, k.admin_note, k.submitted_at, k.processed_at`

// List KYC belgelerini (üye bilgileriyle) sayfalı döndürür; status verilirse filtreler.
func (s *KYCService) List(ctx context.Context, status string, limit, offset int) ([]models.KYCDocument, int64, error) {
	where := ""
	args := make([]any, 0, 3)
	if status != "" {
		where = ` WHERE k.status = $1`
		args = append(args, status)
	}

	var total int64
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM kyc_documents k`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("KYC kayıtları sayılamadı: %w", err)
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT %s FROM kyc_documents k
		JOIN users u ON u.id = k.user_id%s
		ORDER BY k.id DESC LIMIT $%d OFFSET $%d`,
		kycColumns, where, len(args)-1, len(args))

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("KYC kayıtları listelenemedi: %w", err)
	}
	defer rows.Close()

	docs := make([]models.KYCDocument, 0)
	for rows.Next() {
		var d models.KYCDocument
		if err := rows.Scan(&d.ID, &d.UserID, &d.UserName, &d.MemberCode, &d.DocumentType,
			&d.FilePath, &d.Status, &d.AdminNote, &d.SubmittedAt, &d.ProcessedAt); err != nil {
			return nil, 0, fmt.Errorf("KYC satırı okunamadı: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, total, rows.Err()
}

// SetStatus belgenin durumunu günceller (approved/rejected) ve denetim kaydı yazar.
func (s *KYCService) SetStatus(ctx context.Context, adminID int64, adminName string, docID int64, status, note string) error {
	if status != "approved" && status != "rejected" {
		return fmt.Errorf("geçersiz durum: 'approved' veya 'rejected' olmalıdır")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE kyc_documents SET status = $1, admin_note = NULLIF($2, ''), processed_at = NOW()
		WHERE id = $3 AND status = 'pending'`, status, note, docID)
	if err != nil {
		return fmt.Errorf("KYC durumu güncellenemedi: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return fmt.Errorf("KYC belgesi bulunamadı veya zaten işlenmiş")
	}

	action := "kyc_approve"
	if status == "rejected" {
		action = "kyc_reject"
	}
	if err := logInTx(ctx, tx, adminID, adminName, action, "kyc_document", &docID, note, nil); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}
	return nil
}

// Submit üye tarafından yeni bir KYC belgesi ekler (status: pending).
// documentType: "identity" | "address"; filePath daha önce /upload ile
// yüklenen dosyanın yoludur.
func (s *KYCService) Submit(ctx context.Context, userID int64, documentType, filePath string) error {
	if documentType != "identity" && documentType != "address" {
		return fmt.Errorf("geçersiz belge türü: 'identity' veya 'address' olmalıdır")
	}
	if filePath == "" {
		return fmt.Errorf("belge dosyası zorunludur")
	}
	if _, err := s.db.Exec(ctx, `
		INSERT INTO kyc_documents (user_id, document_type, file_path)
		VALUES ($1, $2, $3)`, userID, documentType, filePath); err != nil {
		return fmt.Errorf("KYC belgesi eklenemedi: %w", err)
	}
	return nil
}

// ListByUser üyenin kendi KYC belgelerini döndürür.
func (s *KYCService) ListByUser(ctx context.Context, userID int64) ([]models.KYCDocument, error) {
	rows, err := s.db.Query(ctx, `
		SELECT k.id, k.user_id, u.name, u.member_code, k.document_type, k.file_path, k.status, k.admin_note, k.submitted_at, k.processed_at
		FROM kyc_documents k
		JOIN users u ON u.id = k.user_id
		WHERE k.user_id = $1
		ORDER BY k.id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("KYC belgeleri listelenemedi: %w", err)
	}
	defer rows.Close()

	docs := make([]models.KYCDocument, 0)
	for rows.Next() {
		var d models.KYCDocument
		if err := rows.Scan(&d.ID, &d.UserID, &d.UserName, &d.MemberCode, &d.DocumentType,
			&d.FilePath, &d.Status, &d.AdminNote, &d.SubmittedAt, &d.ProcessedAt); err != nil {
			return nil, fmt.Errorf("KYC satırı okunamadı: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}
