package models

// SponsorTreeNode sponsorluk ağacındaki bir düğümü temsil eder.
// Binary ağaçtan farklı olarak sağ/sol yoktur; her üye kendi sponsorunun
// altında listelenir. Müşteriler de zincirde yaprak düğüm olarak görünür.
type SponsorTreeNode struct {
	UserID             int64              `json:"user_id"`
	Name               string             `json:"name"`
	Email              string             `json:"email"`
	MemberCode         string             `json:"member_code"`
	Role               string             `json:"role"`
	PackageID          *int               `json:"package_id"`
	PackageName        string             `json:"package_name"`
	IsActive           bool               `json:"is_active"`
	IsInPendingPool    bool               `json:"is_in_pending_pool"`
	TotalPVAccumulated int64              `json:"total_pv_accumulated"`
	ChildCount         int64              `json:"child_count"`
	Children           []*SponsorTreeNode `json:"children"`
}
