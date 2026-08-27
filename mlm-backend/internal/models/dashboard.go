package models

import "time"

// DashboardSummary kullanıcının kendi kazanç özetini tutar.
type DashboardSummary struct {
	MemberCode         string  `json:"member_code"`
	Rank               *string `json:"rank"`
	Package            *string `json:"package"`
	Wallet             Wallet  `json:"wallet"`
	TotalReferral      float64 `json:"total_referral"`
	TotalBinary        float64 `json:"total_binary"`
	TotalMatching      float64 `json:"total_matching"`
	MonthEarnings      float64 `json:"month_earnings"`
	MonthBinaryEarned  float64 `json:"month_binary_earned"`
	MonthlyBinaryLimit float64 `json:"monthly_binary_limit"`
}

// TeamSummary kullanıcının ekip ve binary bacak özetini tutar.
type TeamSummary struct {
	DirectSponsorCount int64 `json:"direct_sponsor_count"`
	SponsorTeamCount   int64 `json:"sponsor_team_count"`
	BinaryTeamCount    int64 `json:"binary_team_count"`
	LeftTeamCount      int64 `json:"left_team_count"`
	RightTeamCount     int64 `json:"right_team_count"`
	TotalPVLeft        int64 `json:"total_pv_left"`
	TotalPVRight       int64 `json:"total_pv_right"`
	TotalCVLeft        int64 `json:"total_cv_left"`
	TotalCVRight       int64 `json:"total_cv_right"`
}

// Commission veritabanındaki commissions tablosunun Go karşılığıdır.
type Commission struct {
	ID             int64      `json:"id"`
	UserID         int64      `json:"user_id"`
	FromUserID     *int64     `json:"from_user_id"`
	Type           string     `json:"type"`
	Amount         float64    `json:"amount"`
	RelatedCV      *int64     `json:"related_cv"`
	RelatedOrderID *int64     `json:"related_order_id"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	PaidAt         *time.Time `json:"paid_at"`
}

// UserBrief dashboard için sadeleştirilmiş kullanıcı bilgisidir.
type UserBrief struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	MemberCode  string  `json:"member_code"`
	PackageName *string `json:"package"`
	RankName    *string `json:"rank"`
}

// UserDashboard kullanıcının tam dashboard verisidir.
type UserDashboard struct {
	User                  UserBrief    `json:"user"`
	Wallet                Wallet       `json:"wallet"`
	TotalReferralEarnings float64      `json:"total_referral_earnings"`
	TotalBinaryEarnings   float64      `json:"total_binary_earnings"`
	TotalMatchingEarnings float64      `json:"total_matching_earnings"`
	TotalRetailEarnings   float64      `json:"total_retail_earnings"`
	MonthlyEarned         float64      `json:"monthly_earned"`
	MonthlyMatchedCV      int64        `json:"monthly_matched_cv"`
	LegCVLeftTotal        int64        `json:"leg_cv_left_total"`
	LegCVRightTotal       int64        `json:"leg_cv_right_total"`
	MonthlyMatchCount     int64        `json:"monthly_match_count"`
	LeftTeamCount         int64        `json:"left_team_count"`
	RightTeamCount        int64        `json:"right_team_count"`
	LeftPV                int64        `json:"left_pv"`
	RightPV               int64        `json:"right_pv"`
	LeftCV                int64        `json:"left_cv"`
	RightCV               int64        `json:"right_cv"`
	RecentCommissions     []Commission `json:"recent_commissions"`
	RecentOrders          []Order      `json:"recent_orders"`
	CurrentRank           *Rank        `json:"current_rank"`
	CurrentPackage        *Package     `json:"current_package"`
}

// AdminDashboard admin paneli özet istatistikleridir.
type AdminDashboard struct {
	TotalUsers             int64             `json:"total_users"`
	ActiveUsers            int64             `json:"active_users"`
	PendingUsers           int64             `json:"pending_users"`
	TotalOrders            int64             `json:"total_orders"`
	TotalRevenue           float64           `json:"total_revenue"`
	TotalCommissionsPaid   float64           `json:"total_commissions_paid"`
	TotalWithdrawals       float64           `json:"total_withdrawals"`
	MonthlyCommissions     float64           `json:"monthly_commissions"`   // bu ay dağıtılan komisyon
	PendingCommissions     float64           `json:"pending_commissions"`   // ödenmeyi bekleyen hakedişler
	NetProfit              float64           `json:"net_profit"`            // ciro - komisyon - çekimler
	RegistrationGrowth     []GrowthPoint     `json:"registration_growth"`   // son 14 gün günlük kayıt
	RecentUsers            []User            `json:"recent_users"`
	RecentWithdrawRequests []WithdrawRequest `json:"recent_withdraw_requests"`
}

// GrowthPoint bir gündeki yeni üye sayısını gösterir (grafik için).
type GrowthPoint struct {
	Date  string `json:"date"`  // YYYY-MM-DD
	Count int64  `json:"count"` // o gün kayıt olan üye sayısı
}

// UserInfoCard ağaç kartlarındaki "i" bilgi modalı için kullanıcı detayıdır.
type UserInfoCard struct {
	UserID         int64    `json:"user_id"`
	Name           string   `json:"name"`
	MemberCode     string   `json:"member_code"`
	Rank           *string  `json:"rank"`
	Package        *string  `json:"package"`
	IsActive       bool     `json:"is_active"`
	Position       *string  `json:"position"`
	SponsorName    *string  `json:"sponsor_name"`
	WalletBalance  float64  `json:"wallet_balance"`
	ChipBalance    float64  `json:"chip_balance"`
	TotalPVLeft    int64    `json:"total_pv_left"`
	TotalPVRight   int64    `json:"total_pv_right"`
	TotalCVLeft    int64    `json:"total_cv_left"`
	TotalCVRight   int64    `json:"total_cv_right"`
	LeftTeamCount  int64    `json:"left_team_count"`
	RightTeamCount int64    `json:"right_team_count"`
	TotalTeamCount int64    `json:"total_team_count"`
}

// TreeNode binary ağaç görünümü için recursive düğümdür.
type TreeNode struct {
	UserID            int64     `json:"user_id"`
	Name              string    `json:"name"`
	MemberCode        string    `json:"member_code"`
	Position          *string   `json:"position"`
	Package           *string   `json:"package"`
	Rank              *string   `json:"rank"`
	ImagePath         *string   `json:"image_path"`
	TotalPVAccumulated int64    `json:"total_pv_accumulated"`
	TotalCVAccumulated int64    `json:"total_cv_accumulated"`
	TotalPVLeft        int64    `json:"total_pv_left"`
	TotalPVRight       int64    `json:"total_pv_right"`
	TotalCVLeft        int64    `json:"total_cv_left"`
	TotalCVRight       int64    `json:"total_cv_right"`
	IsActive           bool     `json:"is_active"`
	Role               string   `json:"role"`
	LeftChild          *TreeNode `json:"left_child"`
	RightChild         *TreeNode `json:"right_child"`
}
