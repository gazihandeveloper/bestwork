package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/database"
	"mlm-backend/internal/models"
	"mlm-backend/internal/services"
)

// EshopAccountHandler eshop storefront'unun "Hesabım" sayfalarının beklediği
// sipariş ve cüzdan sözleşmesini BestWork verisinden üretir.
type EshopAccountHandler struct {
	orders    *services.OrderService
	wallets   *services.WalletService
	products  *services.ProductService
	dashboard *services.DashboardService
	users     *services.UserService
	packages  *services.PackageService
	pool      *services.PendingPoolService
	tickets   *services.TicketService
}

// NewEshopAccountHandler yeni bir handler döndürür.
func NewEshopAccountHandler(orders *services.OrderService, wallets *services.WalletService, products *services.ProductService, dashboard *services.DashboardService, users *services.UserService, packages *services.PackageService, pool *services.PendingPoolService, tickets *services.TicketService) *EshopAccountHandler {
	return &EshopAccountHandler{orders: orders, wallets: wallets, products: products, dashboard: dashboard, users: users, packages: packages, pool: pool, tickets: tickets}
}

// meSummary eshop dashboard'u için BestWork üye bilgisini geniş alanlarla döndürür.
func (h *EshopAccountHandler) meSummary(c *gin.Context, userID int64) gin.H {
	u, err := h.users.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		return gin.H{"id": userID}
	}
	rankName := ""
	if u.CurrentRankID != nil {
		rankID := *u.CurrentRankID
		if r, err := services.GetRankByID(c.Request.Context(), database.GetDB(), rankID); err == nil && r != nil {
			rankName = r.Name
		}
	}
	pkgName := ""
	if u.PackageID != nil {
		pkgID := *u.PackageID
		if pk, err := h.packages.GetPackageByID(c.Request.Context(), pkgID); err == nil && pk != nil {
			pkgName = pk.Name
		}
	}
	phone := ""
	if u.Phone != nil {
		phone = *u.Phone
	}
	return gin.H{
		"id":                          u.ID,
		"name":                        u.Name,
		"email":                       u.Email,
		"member_code":                 u.MemberCode,
		"phone":                       phone,
		"role":                        u.Role,
		"is_active":                   u.IsActive,
		"current_rank_id":             u.CurrentRankID,
		"current_rank_name":           rankName,
		"package_id":                  u.PackageID,
		"package_name":                pkgName,
		"total_pv_accumulated":        u.TotalPVAccumulated,
		"total_cv_accumulated":        u.TotalCVAccumulated,
		"total_pv_left":               u.TotalPVLeft,
		"total_pv_right":              u.TotalPVRight,
		"total_cv_left":               u.TotalCVLeft,
		"total_cv_right":              u.TotalCVRight,
		"sponsor_id":                  u.SponsorID,
		"is_in_pending_pool":          u.IsInPendingPool,
		"current_month_binary_earned": u.CurrentMonthBinaryEarned,
		"created_at":                  u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// GetMeSummary eshop'un hesap dashboard'u için geniş üye bilgisini döndürür.
func (h *EshopAccountHandler) GetMeSummary(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Oturum bilgisi eksik"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": h.meSummary(c, userID)})
}

// ListRanks eshop dashboard için kariyer listesini döndürür.
func (h *EshopAccountHandler) ListRanks(c *gin.Context) {
	ranks, err := services.GetAllRanks(c.Request.Context(), database.GetDB())
	if err != nil {
		log.WithError(err).Error("Eshop rütbeler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Rütbeler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": ranks})
}

// ListPackages eshop dashboard için paket (seviye) listesini döndürür.
func (h *EshopAccountHandler) ListPackages(c *gin.Context) {
	packages, err := h.packages.ListPackages(c.Request.Context())
	if err != nil {
		log.WithError(err).Error("Eshop paketler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Paketler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": packages})
}

// ListSponsored eshop dashboard için sponsor olunan üyelerin sayısını döndürür.
func (h *EshopAccountHandler) ListSponsored(c *gin.Context) {
	userID := c.GetInt64("user_id")
	users, err := h.users.ListSponsoredUsers(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop sponsorlar listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Sponsorlar listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"count": len(users), "users": users}})
}

// ListPendingPool eshop dashboard için sponsor bazlı yerleşim bekleyenleri döndürür.
func (h *EshopAccountHandler) ListPendingPool(c *gin.Context) {
	userID := c.GetInt64("user_id")
	users, err := h.pool.ListPendingUsersBySponsor(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop bekleyenler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Bekleyenler listelenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

// ListTickets eshop hesabım sayfası için kullanıcının destek taleplerini döndürür.
func (h *EshopAccountHandler) ListTickets(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Oturum bilgisi eksik"})
		return
	}
	tickets, err := h.tickets.ListByUser(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop talepler listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Talepler listelenemedi"})
		return
	}
	items := make([]gin.H, 0, len(tickets))
	for _, t := range tickets {
		items = append(items, gin.H{
			"id":         t.ID,
			"status":     t.Status,
			"message":    t.Message,
			"created_at": t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// GetTicket eshop kullanıcısının tek bir destek talebini döndürür.
func (h *EshopAccountHandler) GetTicket(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz talep ID"})
		return
	}
	t, err := h.tickets.GetByUser(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Talep bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": t.ID, "status": t.Status, "message": t.Message, "created_at": t.CreatedAt.Format("2006-01-02T15:04:05Z07:00")}})
}

// ReplyTicket eshop kullanıcısının talebine yanıt ekler.
func (h *EshopAccountHandler) ReplyTicket(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz talep ID"})
		return
	}
	var req struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Mesaj gerekli"})
		return
	}
	if _, err := h.tickets.GetByUser(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Talep bulunamadı"})
		return
	}
	if _, err := h.tickets.AppendMessage(c.Request.Context(), id, "[Üye]: "+strings.TrimSpace(req.Message)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Yanıt eklenemedi"})
		return
	}
	h.GetTicket(c)
}

// GetDashboard eshop'un hesap dashboard'u için BestWork MLM özetini döndürür.
// Eshop hesabı giriş yapan üyenin gerçek MLM verisini gösterir.
func (h *EshopAccountHandler) GetDashboard(c *gin.Context) {
	userID := c.GetInt64("user_id")
	dash, err := h.dashboard.GetUserDashboard(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop dashboard getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Dashboard getirilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": dash})
}

// GetProfile eshop dashboard için üye profilini (JSONB) döndürür.
func (h *EshopAccountHandler) GetProfile(c *gin.Context) {
	userID := c.GetInt64("user_id")
	profile, err := h.users.GetProfile(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop profil okunamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Profil okunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": profile})
}

// SetProfileImage eshop dashboard için profil görselini günceller.
func (h *EshopAccountHandler) SetProfileImage(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		ImagePath string `json:"image_path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ImagePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Görsel yolu gerekli"})
		return
	}
	if err := h.users.SetProfileImage(c.Request.Context(), userID, req.ImagePath); err != nil {
		log.WithError(err).Error("Eshop profil görseli güncellenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Bir sorun oluştu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"image_path": req.ImagePath}})
}

// eshopOrderStatus BestWork sipariş durumunu eshop durumuna çevirir.
func eshopOrderStatus(s string) string {
	switch s {
	case "paid":
		return "confirmed"
	case "preparing":
		return "processing"
	case "shipped":
		return "shipped"
	case "delivered":
		return "delivered"
	case "cancelled":
		return "cancelled"
	default:
		return "pending"
	}
}

// eshopPaymentStatus BestWork durumuna göre ödeme durumunu döndürür.
func eshopPaymentStatus(s string) string {
	if s == "paid" || s == "preparing" || s == "shipped" || s == "delivered" {
		return "paid"
	}
	return "pending"
}

// cent BestWork TL değerini eshop cent (kuruş) değerine çevirir.
func cent(tl float64) int64 {
	return int64(tl*100 + 0.5)
}

// eshopOrder BestWork siparişini eshop sözleşmesine dönüştürür.
func (h *EshopAccountHandler) eshopOrder(c *gin.Context, o models.Order) gin.H {
	items := make([]gin.H, 0, len(o.Items))
	// Ürün adı/görseli için küçük ölçekte product lookup.
	productCache := map[int64]*models.Product{}
	for _, it := range o.Items {
		var name, image string
		if it.ProductID != nil {
			if p, ok := productCache[*it.ProductID]; ok {
				if p != nil {
					name, image = p.Name, eshopImagePath(p.ImagePath)
				}
			} else {
				p, err := h.products.GetProductByID(c.Request.Context(), *it.ProductID)
				if err == nil {
					name, image = p.Name, eshopImagePath(p.ImagePath)
					productCache[*it.ProductID] = p
				} else {
					productCache[*it.ProductID] = nil
				}
			}
		}
		if name == "" {
			name = "Ürün"
		}
		items = append(items, gin.H{
			"id":           it.ID,
			"productId":    it.ProductID,
			"productName":  name,
			"productImage": image,
			"quantity":     it.Quantity,
			"price":        cent(it.Price),
			"total":        cent(it.Price) * int64(it.Quantity),
		})
	}

	shipping := cent(o.ShippingFee)
	subtotal := cent(o.TotalAmount) - shipping
	paymentMethod := "eft_havale"
	if o.PaymentMethod == "card" {
		paymentMethod = "credit-card"
	}

	return gin.H{
		"id":            o.ID,
		"orderNumber":   "BW-" + strconv.FormatInt(o.ID, 10),
		"userId":        o.UserID,
		"status":        eshopOrderStatus(o.Status),
		"items":         items,
		"subtotal":      subtotal,
		"shipping":      shipping,
		"discount":      0,
		"total":         cent(o.TotalAmount),
		"paymentMethod": paymentMethod,
		"paymentStatus": eshopPaymentStatus(o.Status),
		"trackingNumber": nil,
		"created_at":    o.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ListOrders eshop'un GET /orders çağrısına karşılık verir.
func (h *EshopAccountHandler) ListOrders(c *gin.Context) {
	userID := c.GetInt64("user_id")
	orders, err := h.orders.ListOrdersByUser(c.Request.Context(), userID)
	if err != nil {
		log.WithError(err).Error("Eshop siparişleri listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Siparişler listelenemedi"})
		return
	}
	out := make([]gin.H, 0, len(orders))
	for _, o := range orders {
		out = append(out, h.eshopOrder(c, o))
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// GetOrder eshop'un GET /orders/:id çağrısına karşılık verir.
func (h *EshopAccountHandler) GetOrder(c *gin.Context) {
	userID := c.GetInt64("user_id")
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz sipariş ID"})
		return
	}
	order, err := h.orders.GetOrderByID(c.Request.Context(), id)
	if err != nil || order.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Sipariş bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": h.eshopOrder(c, *order)})
}

// GetWallet eshop'un GET /wallet çağrısına karşılık verir.
func (h *EshopAccountHandler) GetWallet(c *gin.Context) {
	userID := c.GetInt64("user_id")
	wallet, err := h.wallets.GetWalletByUserID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, services.ErrWalletNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Cüzdan bulunamadı"})
			return
		}
		log.WithError(err).Error("Eshop cüzdanı getirilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Cüzdan getirilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id":             wallet.ID,
		"userId":         wallet.UserID,
		"balance":        cent(wallet.Balance),
		"totalEarned":    cent(wallet.TotalEarned),
		"totalWithdrawn": cent(wallet.TotalWithdrawn),
		"createdAt":      wallet.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		"updatedAt":      wallet.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}})
}

// ListWalletTransactions eshop'un GET /wallet/transactions çağrısına karşılık verir.
func (h *EshopAccountHandler) ListWalletTransactions(c *gin.Context) {
	userID := c.GetInt64("user_id")
	txs, err := h.wallets.ListWalletTransactions(c.Request.Context(), userID, 100, 0)
	if err != nil {
		log.WithError(err).Error("Eshop cüzdan hareketleri listelenemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Hareketler listelenemedi"})
		return
	}
	out := make([]gin.H, 0, len(txs))
	for _, t := range txs {
		desc := ""
		if t.Reason != nil {
			desc = *t.Reason
		}
		out = append(out, gin.H{
			"id":          t.ID,
			"walletId":    t.WalletID,
			"type":        t.Type,
			"amount":      cent(t.Amount),
			"description": desc,
			"status":      "completed",
			"created_at":  t.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}
