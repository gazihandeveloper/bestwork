package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"
)

// JobRun job_runs tablosundaki bir asenkron iş kaydını temsil eder.
type JobRun struct {
	ID         int64           `json:"id"`
	JobType    string          `json:"job_type"`
	Status     string          `json:"status"`
	Progress   int             `json:"progress"`
	Total      int             `json:"total"`
	Meta       json.RawMessage `json:"meta"`
	Error      *string         `json:"error"`
	StartedAt  *time.Time      `json:"started_at"`
	FinishedAt *time.Time      `json:"finished_at"`
	CreatedAt  time.Time       `json:"created_at"`
}

// ErrJobNotFound iş kaydının bulunamadığını belirtir.
var ErrJobNotFound = errors.New("iş kaydı bulunamadı")

// JobService asenkron iş kayıtlarını (job_runs) yönetir.
type JobService struct {
	db *pgxpool.Pool
}

// NewJobService yeni bir JobService örneği döndürür.
func NewJobService(db *pgxpool.Pool) *JobService {
	return &JobService{db: db}
}

const jobColumns = `id, job_type, status, progress, total, meta, error, started_at, finished_at, created_at`

// Create yeni bir iş kaydı oluşturur (status: queued).
func (s *JobService) Create(ctx context.Context, jobType string) (*JobRun, error) {
	var j JobRun
	err := s.db.QueryRow(ctx, `
		INSERT INTO job_runs (job_type) VALUES ($1)
		RETURNING `+jobColumns, jobType).
		Scan(&j.ID, &j.JobType, &j.Status, &j.Progress, &j.Total, &j.Meta, &j.Error, &j.StartedAt, &j.FinishedAt, &j.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("iş kaydı oluşturulamadı: %w", err)
	}
	return &j, nil
}

// Get iş kaydını ID ile döndürür.
func (s *JobService) Get(ctx context.Context, id int64) (*JobRun, error) {
	var j JobRun
	err := s.db.QueryRow(ctx, `SELECT `+jobColumns+` FROM job_runs WHERE id = $1`, id).
		Scan(&j.ID, &j.JobType, &j.Status, &j.Progress, &j.Total, &j.Meta, &j.Error, &j.StartedAt, &j.FinishedAt, &j.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrJobNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("iş kaydı okunamadı: %w", err)
	}
	return &j, nil
}

// ListRecent son iş kayıtlarını döndürür.
func (s *JobService) ListRecent(ctx context.Context, limit int) ([]JobRun, error) {
	rows, err := s.db.Query(ctx, `SELECT `+jobColumns+` FROM job_runs ORDER BY id DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("iş kayıtları listelenemedi: %w", err)
	}
	defer rows.Close()

	jobs := make([]JobRun, 0)
	for rows.Next() {
		var j JobRun
		if err := rows.Scan(&j.ID, &j.JobType, &j.Status, &j.Progress, &j.Total, &j.Meta, &j.Error, &j.StartedAt, &j.FinishedAt, &j.CreatedAt); err != nil {
			return nil, fmt.Errorf("iş kaydı okunamadı: %w", err)
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

// updateProgress iş ilerlemesini günceller.
func (s *JobService) updateProgress(ctx context.Context, id int64, progress, total int) {
	if _, err := s.db.Exec(ctx,
		`UPDATE job_runs SET progress = $1, total = $2 WHERE id = $3`, progress, total, id); err != nil {
		log.WithError(err).WithField("job_id", id).Warn("İş ilerlemesi güncellenemedi")
	}
}

// finish iş kaydını tamamlandı/hatalı olarak kapatır.
func (s *JobService) finish(ctx context.Context, id int64, meta map[string]any, errMsg string) {
	status := "completed"
	if errMsg != "" {
		status = "failed"
	}
	metaJSON := []byte("{}")
	if meta != nil {
		if b, err := json.Marshal(meta); err == nil {
			metaJSON = b
		}
	}
	var errPtr *string
	if errMsg != "" {
		e := errMsg
		errPtr = &e
	}
	if _, err := s.db.Exec(ctx, `
		UPDATE job_runs SET status = $1, meta = $2, error = $3, finished_at = NOW() WHERE id = $4`,
		status, metaJSON, errPtr, id); err != nil {
		log.WithError(err).WithField("job_id", id).Warn("İş kaydı kapatılamadı")
	}
}

// RunBinaryMatchPass tüm aktif ve ağaca yerleşmiş üyeler üzerinde binary
// eşleşme (MatchBinary) geçişini asenkron çalıştırır ve iş kaydını ilerletir.
// MatchBinary idempotent olduğundan (tüketilmiş CV yeniden eşleşmez) güvenlidir.
func (s *JobService) RunBinaryMatchPass(ctx context.Context, jobID int64) {
	if _, err := s.db.Exec(ctx,
		`UPDATE job_runs SET status = 'running', started_at = NOW() WHERE id = $1`, jobID); err != nil {
		log.WithError(err).Error("İş başlatılamadı")
		return
	}

	// Önce kariyerleri yeniden hesapla (matching primi taze unvanlara göre ödenecek).
	tx, err := s.db.Begin(ctx)
	if err != nil {
		s.finish(ctx, jobID, nil, "kariyer hesaplama transaction başlatılamadı: "+err.Error())
		return
	}
	if _, err := RecomputeAllCareers(ctx, tx); err != nil {
		tx.Rollback(ctx)
		s.finish(ctx, jobID, nil, "kariyer hesaplama başarısız: "+err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		s.finish(ctx, jobID, nil, "kariyer hesaplama commit edilemedi: "+err.Error())
		return
	}

	rows, err := s.db.Query(ctx, `
		SELECT id FROM users
		WHERE is_active = true AND parent_id IS NOT NULL
		ORDER BY id`)
	if err != nil {
		s.finish(ctx, jobID, nil, "üye listesi okunamadı: "+err.Error())
		return
	}

	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			s.finish(ctx, jobID, nil, "üye listesi okunamadı: "+err.Error())
			return
		}
		ids = append(ids, id)
	}
	rows.Close()

	total := len(ids)
	failures := 0
	for i, uid := range ids {
		if err := MatchBinary(ctx, s.db, uid); err != nil {
			failures++
			log.WithError(err).WithField("user_id", uid).Warn("Binary eşleşme geçişinde üye atlandı")
		}
		if (i+1)%100 == 0 || i == total-1 {
			s.updateProgress(ctx, jobID, i+1, total)
		}
	}

	s.finish(ctx, jobID, map[string]any{"processed": total, "failures": failures}, "")
	log.WithFields(log.Fields{"job_id": jobID, "total": total, "failures": failures}).
		Info("Toplu binary eşleşme geçişi tamamlandı")
}
