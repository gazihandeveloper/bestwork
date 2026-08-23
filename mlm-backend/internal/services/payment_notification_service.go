package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/models"
)

// Ödeme bildirimi işlemlerine özel hatalar.
var (
	ErrPaymentNotificationNotFound = errors.New("ödeme bildirimi bulunamadı")
	ErrPaymentAlreadyProcessed     = errors.New("ödeme bildirimi zaten işlenmiş")
	ErrPaymentNotificationExists   = errors.New("bu sipariş için aktif bir ödeme bildirimi zaten var")
	ErrPaymentAmountMismatch       = errors.New("bildirim tutarı sipariş tutarıyla eşleşmiyor")
	ErrOrderNotPending             = errors.New("sipariş ödeme beklemiyor")
)

// PaymentNotificationService EFT/HAVALE ödeme bildirimlerini yönetir.
type PaymentNotificationService struct {
	db *pgxpool.Pool
}

// NewPaymentNotificationService yeni bir PaymentNotificationService örneği döndürür.
func NewPaymentNotificationService(db *pgxpool.Pool) *PaymentNotificationService {
	return &PaymentNotificationService{db: db}
}

const paymentNotificationColumns = `id, user_id, order_id, amount, bank_name, reference_no, note, file_path, status, created_at, processed_at, processed_by`

func scanPaymentNotification(row pgx.Row) (*models.PaymentNotification, error) {
	var pn models.PaymentNotification
	err := row.Scan(&pn.ID, &pn.UserID, &pn.OrderID, &pn.Amount, &pn.BankName, &pn.ReferenceNo,
		&pn.Note, &pn.FilePath, &pn.Status, &pn.CreatedAt, &pn.ProcessedAt, &pn.ProcessedBy)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPaymentNotificationNotFound
		}
		return nil, fmt.Errorf("ödeme bildirimi okunamadı: %w", err)
	}
	return &pn, nil
}

// CreatePaymentNotification yeni ödeme bildirimi oluşturur.
func (s *PaymentNotificationService) CreatePaymentNotification(ctx context.Context, userID int64, orderID *int64, amount float64, bankName, referenceNo, note, filePath string) (*models.PaymentNotification, error) {
	if amount <= 0 {
		return nil, errors.New("tutar 0'dan büyük olmalıdır")
	}
	if orderID == nil {
		return nil, errors.New("sipariş seçilmelidir")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var ownerID int64
	var orderAmount float64
	var orderStatus, paymentMethod string
	err = tx.QueryRow(ctx,
		`SELECT user_id, total_amount, status, payment_method FROM orders WHERE id = $1 FOR UPDATE`, *orderID).
		Scan(&ownerID, &orderAmount, &orderStatus, &paymentMethod)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrOrderNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("sipariş sorgulanamadı: %w", err)
	}
	if ownerID != userID {
		return nil, errors.New("bu sipariş size ait değil")
	}
	if orderStatus != "pending" || paymentMethod != "eft_havale" {
		return nil, ErrOrderNotPending
	}
	if !moneyEqual(orderAmount, amount) {
		return nil, ErrPaymentAmountMismatch
	}

	var notificationExists bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM payment_notifications WHERE order_id = $1 AND status IN ('pending','approved'))`,
		*orderID).Scan(&notificationExists); err != nil {
		return nil, fmt.Errorf("ödeme bildirimi kontrolü başarısız: %w", err)
	}
	if notificationExists {
		return nil, ErrPaymentNotificationExists
	}

	var bankPtr, refPtr, notePtr, filePtr *string
	if v := strings.TrimSpace(bankName); v != "" {
		bankPtr = &v
	}
	if v := strings.TrimSpace(referenceNo); v != "" {
		refPtr = &v
	}
	if v := strings.TrimSpace(note); v != "" {
		notePtr = &v
	}
	if v := strings.TrimSpace(filePath); v != "" {
		filePtr = &v
	}

	pn := &models.PaymentNotification{
		UserID:      userID,
		OrderID:     orderID,
		Amount:      round2(amount),
		BankName:    bankPtr,
		ReferenceNo: refPtr,
		Note:        notePtr,
		FilePath:    filePtr,
		Status:      "pending",
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO payment_notifications (user_id, order_id, amount, bank_name, reference_no, note, file_path)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		pn.UserID, pn.OrderID, pn.Amount, pn.BankName, pn.ReferenceNo, pn.Note, pn.FilePath).
		Scan(&pn.ID, &pn.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ödeme bildirimi oluşturulamadı: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"notification_id": pn.ID, "user_id": userID, "order_id": orderID}).
		Info("Ödeme bildirimi oluşturuldu")

	return pn, nil
}

// ListUserPaymentNotifications kullanıcının kendi bildirimlerini döndürür.
func (s *PaymentNotificationService) ListUserPaymentNotifications(ctx context.Context, userID int64, limit, offset int) ([]models.PaymentNotification, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM payment_notifications WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("bildirim sayısı okunamadı: %w", err)
	}

	rows, err := s.db.Query(ctx,
		`SELECT `+paymentNotificationColumns+` FROM payment_notifications WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("bildirimler listelenemedi: %w", err)
	}
	defer rows.Close()

	items := make([]models.PaymentNotification, 0)
	for rows.Next() {
		pn, err := scanPaymentNotification(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *pn)
	}
	return items, total, rows.Err()
}

// ListAllPaymentNotifications tüm bildirimleri döndürür (admin).
func (s *PaymentNotificationService) ListAllPaymentNotifications(ctx context.Context, limit, offset int) ([]models.PaymentNotification, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM payment_notifications`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("bildirim sayısı okunamadı: %w", err)
	}

	rows, err := s.db.Query(ctx,
		`SELECT `+paymentNotificationColumns+` FROM payment_notifications ORDER BY id DESC LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("bildirimler listelenemedi: %w", err)
	}
	defer rows.Close()

	items := make([]models.PaymentNotification, 0)
	for rows.Next() {
		pn, err := scanPaymentNotification(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *pn)
	}
	return items, total, rows.Err()
}

// ApprovePaymentNotification bildirimi onaylar: siparişi 'paid' yapar ve
// sipariş etkilerini (puan/komisyon/binary) uygular. Transaction'dır.
func (s *PaymentNotificationService) ApprovePaymentNotification(ctx context.Context, notificationID, adminID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		orderID *int64
		amount  float64
		status  string
	)
	err = tx.QueryRow(ctx,
		`SELECT order_id, amount, status FROM payment_notifications WHERE id = $1 FOR UPDATE`, notificationID).
		Scan(&orderID, &amount, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPaymentNotificationNotFound
	}
	if err != nil {
		return fmt.Errorf("bildirim okunamadı: %w", err)
	}
	if status != "pending" {
		return ErrPaymentAlreadyProcessed
	}

	if orderID == nil {
		return ErrOrderNotFound
	}

	var orderStatus string
	var orderAmount float64
	err = tx.QueryRow(ctx, `SELECT status, total_amount FROM orders WHERE id = $1 FOR UPDATE`, *orderID).
		Scan(&orderStatus, &orderAmount)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrOrderNotFound
	}
	if err != nil {
		return fmt.Errorf("sipariş okunamadı: %w", err)
	}
	if orderStatus != "pending" {
		return ErrOrderNotPending
	}
	if !moneyEqual(orderAmount, amount) {
		return ErrPaymentAmountMismatch
	}
	if _, err := tx.Exec(ctx, `UPDATE orders SET status = 'paid' WHERE id = $1`, *orderID); err != nil {
		return fmt.Errorf("sipariş durumu güncellenemedi: %w", err)
	}
	if err := ProcessOrderEffects(ctx, tx, *orderID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE payment_notifications SET status = 'approved', processed_at = NOW(), processed_by = $1 WHERE id = $2`,
		adminID, notificationID); err != nil {
		return fmt.Errorf("bildirim durumu güncellenemedi: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"notification_id": notificationID, "admin_id": adminID, "order_id": orderID}).
		Info("Ödeme bildirimi onaylandı")

	return nil
}

// RejectPaymentNotification bildirimi reddeder: ilişkili 'pending' sipariş
// 'cancelled' yapılır ve stoğu iade edilir; puan/komisyon uygulanmaz.
func (s *PaymentNotificationService) RejectPaymentNotification(ctx context.Context, notificationID, adminID int64) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		orderID *int64
		status  string
	)
	err = tx.QueryRow(ctx,
		`SELECT order_id, status FROM payment_notifications WHERE id = $1 FOR UPDATE`, notificationID).
		Scan(&orderID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPaymentNotificationNotFound
	}
	if err != nil {
		return fmt.Errorf("bildirim okunamadı: %w", err)
	}
	if status != "pending" {
		return ErrPaymentAlreadyProcessed
	}

	// İlişkili siparişi iptal et + stok iadesi
	if orderID != nil {
		var orderStatus string
		err := tx.QueryRow(ctx, `SELECT status FROM orders WHERE id = $1 FOR UPDATE`, *orderID).Scan(&orderStatus)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("sipariş okunamadı: %w", err)
		}
		if err == nil && orderStatus == "pending" {
			if _, err := tx.Exec(ctx, `UPDATE orders SET status = 'cancelled' WHERE id = $1`, *orderID); err != nil {
				return fmt.Errorf("sipariş durumu güncellenemedi: %w", err)
			}

			// Stok iadesi (önce kalemleri oku, sonra güncelle — pgx aynı bağlantıda
			// açık Rows varken Exec'e izin vermez)
			itemRows, err := tx.Query(ctx,
				`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, *orderID)
			if err != nil {
				return fmt.Errorf("sipariş kalemleri okunamadı: %w", err)
			}

			type stockRestore struct {
				productID *int64
				qty       int
			}
			restores := make([]stockRestore, 0)
			for itemRows.Next() {
				var r stockRestore
				if err := itemRows.Scan(&r.productID, &r.qty); err != nil {
					itemRows.Close()
					return fmt.Errorf("kalem okunamadı: %w", err)
				}
				restores = append(restores, r)
			}
			itemRows.Close()

			for _, r := range restores {
				if r.productID != nil {
					if _, err := tx.Exec(ctx, `UPDATE products SET stock = stock + $1 WHERE id = $2`, r.qty, *r.productID); err != nil {
						return fmt.Errorf("stok iadesi başarısız: %w", err)
					}
				}
			}
		}
	}

	if _, err := tx.Exec(ctx,
		`UPDATE payment_notifications SET status = 'rejected', processed_at = NOW(), processed_by = $1 WHERE id = $2`,
		adminID, notificationID); err != nil {
		return fmt.Errorf("bildirim durumu güncellenemedi: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{"notification_id": notificationID, "admin_id": adminID, "order_id": orderID}).
		Info("Ödeme bildirimi reddedildi")

	return nil
}
