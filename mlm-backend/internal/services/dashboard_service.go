package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mlm-backend/internal/models"
)

// DashboardService dashboard ve raporlama verilerini hazırlar.
type DashboardService struct {
	db *pgxpool.Pool
}

// NewDashboardService yeni bir DashboardService örneği döndürür.
func NewDashboardService(db *pgxpool.Pool) *DashboardService {
	return &DashboardService{db: db}
}

// loadWallet kullanıcının cüzdanını okur; kayıt yoksa sıfır bakiye ile oluşturup döndürür.
// (Manuel/üçüncü parti oluşturulan kullanıcılarda cüzdan eksik kalabilir; dashboard
// 500 dönmek yerine cüzdanı kendi kendine onarır.)
func (s *DashboardService) loadWallet(ctx context.Context, userID int64) (models.Wallet, error) {
	var w models.Wallet
	err := s.db.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, updated_at
		 FROM wallets WHERE user_id = $1`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.TotalEarned, &w.TotalWithdrawn, &w.ChipBalance, &w.UpdatedAt)
	if err == nil {
		return w, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return w, fmt.Errorf("cüzdan okunamadı: %w", err)
	}
	// Kayıt yoksa sıfır cüzdan oluştur (self-healing)
	if _, ierr := s.db.Exec(ctx,
		`INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn, chip_balance)
		 VALUES ($1, 0, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING`, userID); ierr != nil {
		return w, fmt.Errorf("cüzdan oluşturulamadı: %w", ierr)
	}
	// Yeniden oku (race koşulunda tutarlı satır döner)
	if err := s.db.QueryRow(ctx,
		`SELECT id, user_id, balance, total_earned, total_withdrawn, chip_balance, updated_at
		 FROM wallets WHERE user_id = $1`, userID).
		Scan(&w.ID, &w.UserID, &w.Balance, &w.TotalEarned, &w.TotalWithdrawn, &w.ChipBalance, &w.UpdatedAt); err != nil {
		return w, fmt.Errorf("cüzdan okunamadı: %w", err)
	}
	return w, nil
}

// GetDashboardSummary kullanıcının kazanç özetini döndürür.
func (s *DashboardService) GetDashboardSummary(ctx context.Context, userID int64) (*models.DashboardSummary, error) {
	sum := &models.DashboardSummary{}

	// Üye kodu, rütbe, paket, aylık binary kazanç ve limit
	err := s.db.QueryRow(ctx, `
		SELECT u.member_code, r.name, p.name,
			COALESCE(u.current_month_binary_earned, 0),
			COALESCE(r.monthly_binary_limit, 0)
		FROM users u
		LEFT JOIN ranks r ON r.id = u.current_rank_id
		LEFT JOIN packages p ON p.id = u.package_id
		WHERE u.id = $1`, userID).
		Scan(&sum.MemberCode, &sum.Rank, &sum.Package, &sum.MonthBinaryEarned, &sum.MonthlyBinaryLimit)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("özet okunamadı: %w", err)
	}

	// Cüzdan (kayıt yoksa otomatik oluşturulur)
	w, err := s.loadWallet(ctx, userID)
	if err != nil {
		return nil, err
	}
	sum.Wallet = w

	// Tip bazlı toplam kazanç (tüm zamanlar)
	rows, err := s.db.Query(ctx,
		`SELECT type, COALESCE(SUM(amount), 0) FROM commissions
		 WHERE user_id = $1 AND status = 'paid' GROUP BY type`, userID)
	if err != nil {
		return nil, fmt.Errorf("komisyon toplamları okunamadı: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var typ string
		var total float64
		if err := rows.Scan(&typ, &total); err != nil {
			return nil, fmt.Errorf("komisyon satırı okunamadı: %w", err)
		}
		switch typ {
		case "referral":
			sum.TotalReferral = total
		case "binary":
			sum.TotalBinary = total
		case "matching":
			sum.TotalMatching = total
		}
	}
	rows.Close()

	// Bu ayki toplam kazanç
	if err := s.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM commissions
		WHERE user_id = $1 AND status = 'paid'
		  AND type IN ('referral','binary','matching')
		  AND created_at >= date_trunc('month', NOW())
		  AND created_at < date_trunc('month', NOW()) + interval '1 month'`,
		userID).Scan(&sum.MonthEarnings); err != nil {
		return nil, fmt.Errorf("aylık kazanç okunamadı: %w", err)
	}

	return sum, nil
}

// GetTeamSummary kullanıcının ekip ve binary bacak özetini döndürür.
func (s *DashboardService) GetTeamSummary(ctx context.Context, userID int64) (*models.TeamSummary, error) {
	team := &models.TeamSummary{}

	// Doğrudan sponsor edilenler
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE sponsor_id = $1`, userID).Scan(&team.DirectSponsorCount); err != nil {
		return nil, fmt.Errorf("sponsor sayısı okunamadı: %w", err)
	}

	// Sponsor ağacı (recursive)
	if err := s.db.QueryRow(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id FROM users WHERE sponsor_id = $1
			UNION ALL
			SELECT u.id FROM users u JOIN tree t ON u.sponsor_id = t.id
		)
		SELECT COUNT(*) FROM tree`, userID).Scan(&team.SponsorTeamCount); err != nil {
		return nil, fmt.Errorf("sponsor ekibi okunamadı: %w", err)
	}

	// Binary alt ağaç (recursive, pozisyonlara göre)
	if err := s.db.QueryRow(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id, position FROM users WHERE parent_id = $1
			UNION ALL
			SELECT u.id, u.position FROM users u JOIN tree t ON u.parent_id = t.id
		)
		SELECT COUNT(*),
			COUNT(*) FILTER (WHERE position = 'L'),
			COUNT(*) FILTER (WHERE position = 'R')
		FROM tree`, userID).
		Scan(&team.BinaryTeamCount, &team.LeftTeamCount, &team.RightTeamCount); err != nil {
		return nil, fmt.Errorf("binary ekip okunamadı: %w", err)
	}

	// Bacak PV/CV toplamları
	if err := s.db.QueryRow(ctx,
		`SELECT total_pv_left, total_pv_right, total_cv_left, total_cv_right
		 FROM users WHERE id = $1`, userID).
		Scan(&team.TotalPVLeft, &team.TotalPVRight, &team.TotalCVLeft, &team.TotalCVRight); err != nil {
		return nil, fmt.Errorf("bacak toplamları okunamadı: %w", err)
	}

	return team, nil
}

// GetUserInfoCard ağaç kartındaki "i" modalı için kullanıcı detayını döndürür.
// Kullanıcı temel bilgileri, cüzdan bakiyesi, bacak PV/CV ve recursive ekip sayıları.
func (s *DashboardService) GetUserInfoCard(ctx context.Context, userID int64) (*models.UserInfoCard, error) {
	card := &models.UserInfoCard{}

	// Temel bilgiler + sponsor adı
	err := s.db.QueryRow(ctx, `
		SELECT u.id, u.name, u.member_code, r.name, p.name, u.is_active, u.position,
			sp.name, u.total_pv_left, u.total_pv_right, u.total_cv_left, u.total_cv_right
		FROM users u
		LEFT JOIN ranks r ON r.id = u.current_rank_id
		LEFT JOIN packages p ON p.id = u.package_id
		LEFT JOIN users sp ON sp.id = u.sponsor_id
		WHERE u.id = $1`, userID).
		Scan(&card.UserID, &card.Name, &card.MemberCode, &card.Rank, &card.Package, &card.IsActive, &card.Position,
			&card.SponsorName, &card.TotalPVLeft, &card.TotalPVRight, &card.TotalCVLeft, &card.TotalCVRight)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("kart kullanıcısı okunamadı: %w", err)
	}

	// Cüzdan bakiyeleri (kayıt yoksa otomatik oluşturulur)
	w, err := s.loadWallet(ctx, userID)
	if err != nil {
		return nil, err
	}
	card.WalletBalance = w.Balance
	card.ChipBalance = w.ChipBalance

	// Recursive ekip sayıları (pozisyona göre sol/sağ bacak)
	if err := s.db.QueryRow(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id, position FROM users WHERE parent_id = $1
			UNION ALL
			SELECT u.id, u.position FROM users u JOIN tree t ON u.parent_id = t.id
		)
		SELECT COUNT(*),
			COUNT(*) FILTER (WHERE position = 'L'),
			COUNT(*) FILTER (WHERE position = 'R')
		FROM tree`, userID).
		Scan(&card.TotalTeamCount, &card.LeftTeamCount, &card.RightTeamCount); err != nil {
		return nil, fmt.Errorf("kart ekip sayıları okunamadı: %w", err)
	}

	return card, nil
}

// ListCommissions kullanıcının komisyon geçmişini döndürür (opsiyonel tip filtresi).
func (s *DashboardService) ListCommissions(ctx context.Context, userID int64, commissionType string, limit int) ([]models.Commission, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `SELECT id, user_id, from_user_id, type, amount, related_cv, related_order_id, status, created_at, paid_at
		FROM commissions WHERE user_id = $1`
	args := []interface{}{userID}

	if commissionType != "" {
		query += ` AND type = $2`
		args = append(args, commissionType)
	}
	query += ` ORDER BY id DESC LIMIT ` + fmt.Sprintf("$%d", len(args)+1)
	args = append(args, limit)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("komisyonlar listelenemedi: %w", err)
	}
	defer rows.Close()

	commissions := make([]models.Commission, 0)
	for rows.Next() {
		var c models.Commission
		if err := rows.Scan(&c.ID, &c.UserID, &c.FromUserID, &c.Type, &c.Amount, &c.RelatedCV,
			&c.RelatedOrderID, &c.Status, &c.CreatedAt, &c.PaidAt); err != nil {
			return nil, fmt.Errorf("komisyon okunamadı: %w", err)
		}
		commissions = append(commissions, c)
	}
	return commissions, rows.Err()
}

// GetUserDashboard kullanıcının tam dashboard verisini hazırlar.
func (s *DashboardService) GetUserDashboard(ctx context.Context, userID int64) (*models.UserDashboard, error) {
	d := &models.UserDashboard{
		RecentCommissions: make([]models.Commission, 0),
		RecentOrders:      make([]models.Order, 0),
	}

	// Temel bilgiler + bacak toplamları
	var rankID, packageID *int
	err := s.db.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, u.member_code, u.current_rank_id, u.package_id,
			u.total_pv_left, u.total_pv_right, u.total_cv_left, u.total_cv_right
		FROM users u WHERE u.id = $1`, userID).
		Scan(&d.User.ID, &d.User.Name, &d.User.Email, &d.User.MemberCode, &rankID, &packageID,
			&d.LeftPV, &d.RightPV, &d.LeftCV, &d.RightCV)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("dashboard kullanıcısı okunamadı: %w", err)
	}

	// Tam rütbe ve paket nesneleri
	if rankID != nil {
		var r models.Rank
		if err := s.db.QueryRow(ctx,
			`SELECT id, name, required_left_pv, required_right_pv, monthly_binary_limit, created_at
			 FROM ranks WHERE id = $1`, *rankID).
			Scan(&r.ID, &r.Name, &r.RequiredLeftPV, &r.RequiredRightPV, &r.MonthlyBinaryLimit, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("rütbe okunamadı: %w", err)
		}
		d.CurrentRank = &r
		d.User.RankName = &r.Name
	}

	if packageID != nil {
		var p models.Package
		if err := s.db.QueryRow(ctx,
			`SELECT id, name, price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate, discount_rate, required_pv, created_at
			 FROM packages WHERE id = $1`, *packageID).
			Scan(&p.ID, &p.Name, &p.Price, &p.ReferralBonusRate, &p.BinaryBonusRate, &p.MatchingBonusRate, &p.DiscountRate, &p.RequiredPV, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("paket okunamadı: %w", err)
		}
		d.CurrentPackage = &p
		d.User.PackageName = &p.Name
	}

	// Cüzdan (kayıt yoksa otomatik oluşturulur)
	w, err := s.loadWallet(ctx, userID)
	if err != nil {
		return nil, err
	}
	d.Wallet = w

	// Tip bazlı toplam kazanç
	rows, err := s.db.Query(ctx,
		`SELECT type, COALESCE(SUM(amount), 0) FROM commissions
		 WHERE user_id = $1 AND status = 'paid' GROUP BY type`, userID)
	if err != nil {
		return nil, fmt.Errorf("komisyon toplamları okunamadı: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var typ string
		var total float64
		if err := rows.Scan(&typ, &total); err != nil {
			return nil, fmt.Errorf("komisyon satırı okunamadı: %w", err)
		}
		switch typ {
		case "referral":
			d.TotalReferralEarnings = total
		case "binary":
			d.TotalBinaryEarnings = total
		case "matching":
			d.TotalMatchingEarnings = total
		case "retail":
			d.TotalRetailEarnings = total
		}
	}
	rows.Close()

	// Bu ay ödenen toplam komisyon (referans + binary + matching + retail)
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM commissions
		 WHERE user_id = $1 AND status = 'paid' AND paid_at >= date_trunc('month', NOW())`, userID).
		Scan(&d.MonthlyEarned); err != nil {
		return nil, fmt.Errorf("aylık kazanç okunamadı: %w", err)
	}

	// Bu ay gerçekleşen eşleşme adedi
	if err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM commissions
		 WHERE user_id = $1 AND type = 'binary' AND status = 'paid' AND paid_at >= date_trunc('month', NOW())`, userID).
		Scan(&d.MonthlyMatchCount); err != nil {
		return nil, fmt.Errorf("eşleşme adedi okunamadı: %w", err)
	}

	// Bacaklara eklenen toplam (kümülatif) CV — eşleşmeyle düşmez
	if err := s.db.QueryRow(ctx,
		`SELECT
		   COALESCE(SUM(cv) FILTER (WHERE position = 'L'), 0),
		   COALESCE(SUM(cv) FILTER (WHERE position = 'R'), 0)
		 FROM binary_transactions
		 WHERE user_id = $1 AND transaction_type = 'add'`, userID).
		Scan(&d.LegCVLeftTotal, &d.LegCVRightTotal); err != nil {
		return nil, fmt.Errorf("bacak toplamları okunamadı: %w", err)
	}

	// Bu ay eşleşen toplam CV (binary komisyonlarından; eşleşme sonrası sıfırlanmaz)
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(related_cv), 0) FROM commissions
		 WHERE user_id = $1 AND type = 'binary' AND status = 'paid' AND paid_at >= date_trunc('month', NOW())`, userID).
		Scan(&d.MonthlyMatchedCV); err != nil {
		return nil, fmt.Errorf("aylık eşleşme okunamadı: %w", err)
	}

	// Ekip sayıları (binary alt ağaç)
	if err := s.db.QueryRow(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id, position FROM users WHERE parent_id = $1
			UNION ALL
			SELECT u.id, u.position FROM users u JOIN tree t ON u.parent_id = t.id
		)
		SELECT COUNT(*) FILTER (WHERE position = 'L'), COUNT(*) FILTER (WHERE position = 'R')
		FROM tree`, userID).
		Scan(&d.LeftTeamCount, &d.RightTeamCount); err != nil {
		return nil, fmt.Errorf("ekip sayıları okunamadı: %w", err)
	}

	// Son 10 komisyon
	recentCommissions, err := s.ListCommissions(ctx, userID, "", 10)
	if err != nil {
		return nil, err
	}
	d.RecentCommissions = recentCommissions

	// Son 5 sipariş
	orderRows, err := s.db.Query(ctx,
		`SELECT id, user_id, total_amount, total_pv, total_cv, status, created_at
		 FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 5`, userID)
	if err != nil {
		return nil, fmt.Errorf("siparişler okunamadı: %w", err)
	}
	defer orderRows.Close()
	for orderRows.Next() {
		var o models.Order
		if err := orderRows.Scan(&o.ID, &o.UserID, &o.TotalAmount, &o.TotalPV, &o.TotalCV, &o.Status, &o.CreatedAt); err != nil {
			return nil, fmt.Errorf("sipariş okunamadı: %w", err)
		}
		o.Items = make([]models.OrderItem, 0)
		d.RecentOrders = append(d.RecentOrders, o)
	}

	return d, orderRows.Err()
}

// GetAdminDashboard admin paneli özet istatistiklerini hazırlar.
func (s *DashboardService) GetAdminDashboard(ctx context.Context) (*models.AdminDashboard, error) {
	d := &models.AdminDashboard{
		RecentUsers:            make([]models.User, 0),
		RecentWithdrawRequests: make([]models.WithdrawRequest, 0),
	}

	// Sayaçlar
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&d.TotalUsers); err != nil {
		return nil, fmt.Errorf("kullanıcı sayısı okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE is_active = true`).Scan(&d.ActiveUsers); err != nil {
		return nil, fmt.Errorf("aktif kullanıcı sayısı okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM pending_pool WHERE is_placed = false`).Scan(&d.PendingUsers); err != nil {
		return nil, fmt.Errorf("bekleyen sayısı okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&d.TotalOrders); err != nil {
		return nil, fmt.Errorf("sipariş sayısı okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled'`).Scan(&d.TotalRevenue); err != nil {
		return nil, fmt.Errorf("ciro okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE status = 'paid'`).Scan(&d.TotalCommissionsPaid); err != nil {
		return nil, fmt.Errorf("ödenen komisyon okunamadı: %w", err)
	}
	if err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM withdraw_requests WHERE status = 'approved'`).Scan(&d.TotalWithdrawals); err != nil {
		return nil, fmt.Errorf("toplam çekim okunamadı: %w", err)
	}

	// Son 10 kullanıcı
	rows, err := s.db.Query(ctx, `SELECT `+userColumns+` FROM users ORDER BY id DESC LIMIT 10`)
	if err != nil {
		return nil, fmt.Errorf("son kullanıcılar okunamadı: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		u, err := scanUserRow(rows)
		if err != nil {
			return nil, fmt.Errorf("kullanıcı okunamadı: %w", err)
		}
		d.RecentUsers = append(d.RecentUsers, *u)
	}
	rows.Close()

	// Son 10 çekim talebi
	wRows, err := s.db.Query(ctx, `SELECT `+withdrawColumns+` FROM withdraw_requests ORDER BY id DESC LIMIT 10`)
	if err != nil {
		return nil, fmt.Errorf("çekim talepleri okunamadı: %w", err)
	}
	defer wRows.Close()
	for wRows.Next() {
		var wr models.WithdrawRequest
		if err := wRows.Scan(&wr.ID, &wr.UserID, &wr.Amount, &wr.Method, &wr.Status, &wr.RequestedAt, &wr.ProcessedAt); err != nil {
			return nil, fmt.Errorf("çekim talebi okunamadı: %w", err)
		}
		d.RecentWithdrawRequests = append(d.RecentWithdrawRequests, wr)
	}

	return d, wRows.Err()
}

// GetTree belirtilen kullanıcının binary alt ağacını döndürür.
// depth, kökün altına kaç seviye inileceğini belirler (0 = yalnız kök, max 5).
func (s *DashboardService) GetTree(ctx context.Context, userID int64, depth int) (*models.TreeNode, error) {
	if depth < 0 {
		depth = 0
	}
	if depth > 5 {
		depth = 5
	}
	return s.buildTreeNode(ctx, userID, depth)
}

// buildTreeNode recursive olarak ağaç düğümü oluşturur.
func (s *DashboardService) buildTreeNode(ctx context.Context, userID int64, depth int) (*models.TreeNode, error) {
	node := &models.TreeNode{}

	err := s.db.QueryRow(ctx, `
		SELECT u.id, u.name, u.member_code, u.position, p.name, r.name, u.profile->>'profile_image',
			u.total_pv_accumulated, u.total_cv_accumulated,
			u.total_pv_left, u.total_pv_right, u.total_cv_left, u.total_cv_right, u.is_active, u.role
		FROM users u
		LEFT JOIN packages p ON p.id = u.package_id
		LEFT JOIN ranks r ON r.id = u.current_rank_id
		WHERE u.id = $1`, userID).
		Scan(&node.UserID, &node.Name, &node.MemberCode, &node.Position, &node.Package, &node.Rank, &node.ImagePath,
			&node.TotalPVAccumulated, &node.TotalCVAccumulated,
			&node.TotalPVLeft, &node.TotalPVRight, &node.TotalCVLeft, &node.TotalCVRight, &node.IsActive, &node.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("ağaç düğümü okunamadı: %w", err)
	}

	if depth <= 0 {
		return node, nil
	}

	// Alt düğüm id'lerini önce topla ve satırları KAPAT; ardından recursive çağrı
	// yap. Böylece her istek aynı anda yalnızca 1 bağlantı kullanır (havuz tükenmez).
	children, err := s.db.Query(ctx,
		`SELECT id, position FROM users WHERE parent_id = $1 ORDER BY position`, userID)
	if err != nil {
		return nil, fmt.Errorf("alt düğümler okunamadı: %w", err)
	}
	type childRef struct {
		id int64
		pos *string
	}
	refs := make([]childRef, 0, 2)
	for children.Next() {
		var childID int64
		var pos *string
		if err := children.Scan(&childID, &pos); err != nil {
			children.Close()
			return nil, fmt.Errorf("alt düğüm okunamadı: %w", err)
		}
		refs = append(refs, childRef{id: childID, pos: pos})
	}
	if err := children.Err(); err != nil {
		children.Close()
		return nil, fmt.Errorf("alt düğümler okunamadı: %w", err)
	}
	children.Close()

	for _, ref := range refs {
		child, err := s.buildTreeNode(ctx, ref.id, depth-1)
		if err != nil {
			return nil, err
		}
		if ref.pos != nil && *ref.pos == "L" {
			node.LeftChild = child
		} else {
			node.RightChild = child
		}
	}

	return node, nil
}
