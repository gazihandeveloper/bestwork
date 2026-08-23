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

// Sipariş işlemlerine özel hatalar.
var (
	ErrProductNotFound        = errors.New("ürün bulunamadı")
	ErrInsufficientStock      = errors.New("yetersiz stok")
	ErrInvalidQuantity        = errors.New("miktar 0'dan büyük olmalıdır")
	ErrEmptyOrder             = errors.New("sipariş en az bir kalem içermelidir")
	ErrOrderNotFound          = errors.New("sipariş bulunamadı")
	ErrOrderNotPaid           = errors.New("sipariş ödenmiş durumda değil")
	ErrCardPaymentUnavailable = errors.New("kredi kartı ödeme sağlayıcısı yapılandırılmamış; EFT/HAVALE kullanın")
)

// OrderItemInput sipariş kalemi girdisidir.
type OrderItemInput struct {
	ProductID int64 `json:"product_id" binding:"required"`
	Quantity  int   `json:"quantity" binding:"required,gt=0"`
}

// OrderService sipariş işlemlerini yürütür.
type OrderService struct {
	db *pgxpool.Pool
}

// NewOrderService yeni bir OrderService örneği döndürür.
func NewOrderService(db *pgxpool.Pool) *OrderService {
	return &OrderService{db: db}
}

const orderColumns = `id, user_id, total_amount, total_pv, total_cv, status, payment_method, created_at`

// CreateOrder siparişi transaction içinde oluşturur: sipariş + kalemler + stok düşümü.
// Yalnızca doğrulanabilir EFT/HAVALE akışı desteklenir. Sipariş ödeme bildirimi
// onaylanana kadar pending kalır ve hiçbir puan/komisyon etkisi uygulanmaz.
func (s *OrderService) CreateOrder(ctx context.Context, userID int64, paymentMethod string, items []OrderItemInput) (*models.Order, error) {
	if len(items) == 0 {
		return nil, ErrEmptyOrder
	}

	paymentMethod = strings.TrimSpace(paymentMethod)
	if paymentMethod == "" {
		paymentMethod = "eft_havale"
	}
	if paymentMethod == "kredi_karti" {
		return nil, ErrCardPaymentUnavailable
	}
	if paymentMethod != "eft_havale" {
		return nil, errors.New("geçersiz ödeme yöntemi: 'eft_havale' olmalıdır")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction başlatılamadı: %w", err)
	}
	defer tx.Rollback(ctx)

	// Kullanıcının mevcut paketinin indirim oranı (ör. Platin)
	var packageID *int
	if err := tx.QueryRow(ctx,
		`SELECT package_id FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&packageID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("kullanıcı sorgulanamadı: %w", err)
	}

	discountRate := 0.0
	if packageID != nil {
		var rate float64
		if err := tx.QueryRow(ctx, `SELECT discount_rate FROM packages WHERE id = $1`, *packageID).Scan(&rate); err == nil {
			discountRate = rate
		}
	}

	type itemRow struct {
		productID int64
		quantity  int
		price     float64
		pv        int64
		cv        int64
	}
	itemRows := make([]itemRow, 0, len(items))

	var totalAmountCents int64
	var totalPV, totalCV int64

	for _, item := range items {
		if item.Quantity <= 0 {
			return nil, ErrInvalidQuantity
		}

		var p models.Product
		err := tx.QueryRow(ctx,
			`SELECT id, name, price, pv, cv, stock, description FROM products WHERE id = $1 FOR UPDATE`, item.ProductID).
			Scan(&p.ID, &p.Name, &p.Price, &p.PV, &p.CV, &p.Stock, &p.Description)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: ID %d", ErrProductNotFound, item.ProductID)
		}
		if err != nil {
			return nil, fmt.Errorf("ürün sorgulanamadı: %w", err)
		}

		if p.Stock < item.Quantity {
			return nil, fmt.Errorf("%w: %s (mevcut: %d)", ErrInsufficientStock, p.Name, p.Stock)
		}

		// Platin (veya indirimli) pakete sahip kullanıcıya indirimli fiyat uygula
		unitPriceCents := moneyToCents(p.Price)
		if discountRate > 0 {
			unitPriceCents = int64(float64(unitPriceCents)*(1-discountRate) + 0.5)
		}
		unitPrice := centsToMoney(unitPriceCents)

		qty := int64(item.Quantity)
		itemRows = append(itemRows, itemRow{
			productID: p.ID,
			quantity:  item.Quantity,
			price:     unitPrice,
			pv:        p.PV * qty,
			cv:        p.CV * qty,
		})
		totalAmountCents += unitPriceCents * qty
		totalPV += p.PV * qty
		totalCV += p.CV * qty
	}
	totalAmount := centsToMoney(totalAmountCents)

	order := &models.Order{
		UserID:        userID,
		TotalAmount:   totalAmount,
		TotalPV:       totalPV,
		TotalCV:       totalCV,
		Status:        "pending",
		PaymentMethod: paymentMethod,
		Items:         make([]models.OrderItem, 0, len(itemRows)),
	}

	if err := tx.QueryRow(ctx,
		`INSERT INTO orders (user_id, total_amount, total_pv, total_cv, status, payment_method)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		order.UserID, order.TotalAmount, order.TotalPV, order.TotalCV, order.Status, order.PaymentMethod).
		Scan(&order.ID, &order.CreatedAt); err != nil {
		return nil, fmt.Errorf("sipariş eklenemedi: %w", err)
	}

	// Kalemleri ekle ve stok düş
	for _, r := range itemRows {
		var itemID int64
		if err := tx.QueryRow(ctx,
			`INSERT INTO order_items (order_id, product_id, quantity, price, pv, cv) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			order.ID, r.productID, r.quantity, r.price, r.pv, r.cv).Scan(&itemID); err != nil {
			return nil, fmt.Errorf("sipariş kalemi eklenemedi: %w", err)
		}
		order.Items = append(order.Items, models.OrderItem{
			ID:        itemID,
			OrderID:   order.ID,
			ProductID: &r.productID,
			Quantity:  r.quantity,
			Price:     r.price,
			PV:        r.pv,
			CV:        r.cv,
		})

		if _, err := tx.Exec(ctx, `UPDATE products SET stock = stock - $1 WHERE id = $2`, r.quantity, r.productID); err != nil {
			return nil, fmt.Errorf("stok güncellenemedi: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("transaction tamamlanamadı: %w", err)
	}

	log.WithFields(log.Fields{
		"order_id":       order.ID,
		"user_id":        userID,
		"total_amount":   order.TotalAmount,
		"total_pv":       order.TotalPV,
		"total_cv":       order.TotalCV,
		"payment_method": order.PaymentMethod,
		"status":         order.Status,
	}).Info("Sipariş oluşturuldu")

	return order, nil
}

// ProcessOrderEffects bir siparişin tüm puan/komisyon etkilerini uygular:
// PV/CV birikimi, referans bonusu, perakende kazancı, paket seviyesi güncellemesi
// ve binary ağaç güncellemesi. Idempotenttir: orders.effects_applied bayrağı ile
// aynı siparişin etkileri yalnızca bir kez uygulanır (transaction içinde çağrılır).
func ProcessOrderEffects(ctx context.Context, q DBTX, orderID int64) error {
	var (
		orderUserID      int64
		totalPV, totalCV int64
		effectsApplied   bool
		status           string
	)
	err := q.QueryRow(ctx,
		`SELECT user_id, total_pv, total_cv, effects_applied, status FROM orders WHERE id = $1 FOR UPDATE`, orderID).
		Scan(&orderUserID, &totalPV, &totalCV, &effectsApplied, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrOrderNotFound
	}
	if err != nil {
		return fmt.Errorf("sipariş okunamadı: %w", err)
	}
	if effectsApplied {
		return nil // Etkiler daha önce uygulanmış
	}
	if status != "paid" {
		return ErrOrderNotPaid
	}

	// Kullanıcıyı kilitle
	var (
		sponsorID          *int64
		totalPVAccumulated int64
		role               string
	)
	if err := q.QueryRow(ctx,
		`SELECT sponsor_id, total_pv_accumulated, role FROM users WHERE id = $1 FOR UPDATE`, orderUserID).
		Scan(&sponsorID, &totalPVAccumulated, &role); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("kullanıcı sorgulanamadı: %w", err)
	}

	if role == "customer" {
		// Müşteri: sponsoruna PV + perakende kazancı
		if err := applyRetailBonus(ctx, q, sponsorID, orderUserID, totalPV, totalCV, orderID); err != nil {
			return err
		}
	} else {
		// Üye: PV/CV birikimi + referans + paket seviyesi + binary
		newTotalPV := totalPVAccumulated + totalPV
		if _, err := q.Exec(ctx,
			`UPDATE users SET total_pv_accumulated = $1, total_cv_accumulated = total_cv_accumulated + $2, updated_at = NOW() WHERE id = $3`,
			newTotalPV, totalCV, orderUserID); err != nil {
			return fmt.Errorf("PV/CV birikimi güncellenemedi: %w", err)
		}

		if err := applyReferralBonus(ctx, q, sponsorID, orderUserID, totalCV, orderID); err != nil {
			return err
		}

		if err := UpdatePackageLevel(ctx, q, orderUserID, newTotalPV); err != nil {
			return err
		}

		if err := ProcessNewOrderForBinary(ctx, q, orderUserID, totalPV, totalCV, &orderID); err != nil {
			return fmt.Errorf("binary ağaç güncellenemedi: %w", err)
		}
	}

	if _, err := q.Exec(ctx, `UPDATE orders SET effects_applied = true WHERE id = $1`, orderID); err != nil {
		return fmt.Errorf("etki bayrağı güncellenemedi: %w", err)
	}

	log.WithField("order_id", orderID).Info("Sipariş etkileri uygulandı")
	return nil
}

// applyRetailBonus müşteri siparişi için sponsor üyeye perakende kazancı yazar:
// sipariş PV'si sponsorun kişisel PV birikimine eklenir, perakende komisyonu
// (toplam CV × sponsor paketinin referans oranı) cüzdana ödenir ve
// sponsorun paket seviyesi güncellenir.
func applyRetailBonus(ctx context.Context, tx DBTX, sponsorID *int64, customerID int64, totalPV, totalCV int64, orderID int64) error {
	if sponsorID == nil {
		return errors.New("müşteri kaydında sponsor eksik")
	}

	var (
		sponsorPackageID *int
		sponsorPV        int64
	)
	if err := tx.QueryRow(ctx,
		`SELECT package_id, total_pv_accumulated FROM users WHERE id = $1 FOR UPDATE`, *sponsorID).
		Scan(&sponsorPackageID, &sponsorPV); err != nil {
		return fmt.Errorf("sponsor sorgulanamadı: %w", err)
	}

	// Müşterinin sipariş PV'si sponsoru üyenin kişisel PV birikimine eklenir
	newSponsorPV := sponsorPV + totalPV
	if _, err := tx.Exec(ctx,
		`UPDATE users SET total_pv_accumulated = $1, updated_at = NOW() WHERE id = $2`, newSponsorPV, *sponsorID); err != nil {
		return fmt.Errorf("sponsor PV birikimi güncellenemedi: %w", err)
	}

	// Perakende komisyonu (sponsorun paketinin referans oranı)
	if sponsorPackageID != nil {
		var rate float64
		if err := tx.QueryRow(ctx, `SELECT referral_bonus_rate FROM packages WHERE id = $1`, *sponsorPackageID).Scan(&rate); err != nil {
			return fmt.Errorf("sponsor paketi sorgulanamadı: %w", err)
		}

		bonus := round2(float64(totalCV) * rate)
		if bonus > 0 {
			if _, err := tx.Exec(ctx,
				`UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2`,
				bonus, *sponsorID); err != nil {
				return fmt.Errorf("sponsor cüzdanı güncellenemedi: %w", err)
			}

			if _, err := tx.Exec(ctx,
				`INSERT INTO commissions (user_id, from_user_id, type, amount, related_cv, related_order_id, status, paid_at)
				 VALUES ($1, $2, 'retail', $3, $4, $5, 'paid', NOW())`,
				*sponsorID, customerID, bonus, totalCV, orderID); err != nil {
				return fmt.Errorf("perakende komisyon kaydı eklenemedi: %w", err)
			}

			log.WithFields(log.Fields{
				"sponsor_id":  *sponsorID,
				"customer_id": customerID,
				"bonus":       bonus,
				"total_cv":    totalCV,
			}).Info("Perakende kazancı ödendi")
		}
	}

	// Sponsorun paket seviyesini güncelle
	if err := UpdatePackageLevel(ctx, tx, *sponsorID, newSponsorPV); err != nil {
		return err
	}

	return nil
}

// applyReferralBonus sponsorun paketine göre referans bonusu öder.
func applyReferralBonus(ctx context.Context, tx DBTX, sponsorID *int64, fromUserID int64, totalCV int64, orderID int64) error {
	if sponsorID == nil {
		return nil
	}

	var sponsorPackageID *int
	if err := tx.QueryRow(ctx, `SELECT package_id FROM users WHERE id = $1 FOR UPDATE`, *sponsorID).Scan(&sponsorPackageID); err != nil {
		return fmt.Errorf("sponsor sorgulanamadı: %w", err)
	}
	if sponsorPackageID == nil {
		return nil // Sponsorun paketi yoksa referans bonusu ödenmez
	}

	var rate float64
	if err := tx.QueryRow(ctx, `SELECT referral_bonus_rate FROM packages WHERE id = $1`, *sponsorPackageID).Scan(&rate); err != nil {
		return fmt.Errorf("sponsor paketi sorgulanamadı: %w", err)
	}

	bonus := round2(float64(totalCV) * rate)
	if bonus <= 0 {
		return nil
	}

	if _, err := tx.Exec(ctx,
		`UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2`,
		bonus, *sponsorID); err != nil {
		return fmt.Errorf("sponsor cüzdanı güncellenemedi: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO commissions (user_id, from_user_id, type, amount, related_cv, related_order_id, status, paid_at)
		 VALUES ($1, $2, 'referral', $3, $4, $5, 'paid', NOW())`,
		*sponsorID, fromUserID, bonus, totalCV, orderID); err != nil {
		return fmt.Errorf("komisyon kaydı eklenemedi: %w", err)
	}

	log.WithFields(log.Fields{
		"sponsor_id": *sponsorID,
		"from_user":  fromUserID,
		"amount":     bonus,
		"total_cv":   totalCV,
	}).Info("Referans bonusu ödendi")

	return nil
}

// ListOrdersByUser kullanıcının siparişlerini kalemleriyle birlikte döndürür.
func (s *OrderService) ListOrdersByUser(ctx context.Context, userID int64) ([]models.Order, error) {
	rows, err := s.db.Query(ctx, `SELECT `+orderColumns+` FROM orders WHERE user_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("siparişler listelenemedi: %w", err)
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.TotalAmount, &o.TotalPV, &o.TotalCV, &o.Status, &o.PaymentMethod, &o.CreatedAt); err != nil {
			return nil, fmt.Errorf("sipariş okunamadı: %w", err)
		}
		items, err := s.getOrderItems(ctx, o.ID)
		if err != nil {
			return nil, err
		}
		o.Items = items
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

// GetOrderByID siparişi kalemleriyle birlikte döndürür.
func (s *OrderService) GetOrderByID(ctx context.Context, orderID int64) (*models.Order, error) {
	var o models.Order
	err := s.db.QueryRow(ctx, `SELECT `+orderColumns+` FROM orders WHERE id = $1`, orderID).
		Scan(&o.ID, &o.UserID, &o.TotalAmount, &o.TotalPV, &o.TotalCV, &o.Status, &o.PaymentMethod, &o.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("sipariş okunamadı: %w", err)
	}

	items, err := s.getOrderItems(ctx, orderID)
	if err != nil {
		return nil, err
	}
	o.Items = items
	return &o, nil
}

// getOrderItems siparişin kalemlerini döndürür.
func (s *OrderService) getOrderItems(ctx context.Context, orderID int64) ([]models.OrderItem, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, order_id, product_id, quantity, price, pv, cv FROM order_items WHERE order_id = $1 ORDER BY id`, orderID)
	if err != nil {
		return nil, fmt.Errorf("sipariş kalemleri okunamadı: %w", err)
	}
	defer rows.Close()

	items := make([]models.OrderItem, 0)
	for rows.Next() {
		var it models.OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.Price, &it.PV, &it.CV); err != nil {
			return nil, fmt.Errorf("sipariş kalemi okunamadı: %w", err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}
