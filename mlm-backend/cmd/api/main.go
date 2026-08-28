package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"mlm-backend/internal/auth"
	"mlm-backend/internal/config"
	"mlm-backend/internal/database"
	"mlm-backend/internal/handlers"
	"mlm-backend/internal/middleware"
	"mlm-backend/internal/services"
)

func main() {
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true})

	// Yapılandırmayı yükle ve JWT anahtarını ayarla
	cfg := config.LoadConfig()
	if err := auth.InitSecret(cfg.JWTSecret); err != nil {
		log.Fatalf("Geçersiz JWT yapılandırması: %v", err)
	}

	// Production'da release modu (env: GIN_MODE=release)
	if cfg.GinMode != "" {
		gin.SetMode(cfg.GinMode)
	}

	// Veritabanı bağlantılarını kur (kapanışta temizlenir)
	if err := database.ConnectPostgres(cfg); err != nil {
		log.Fatalf("PostgreSQL bağlantısı kurulamadı: %v", err)
	}
	defer database.ClosePostgres()

	if err := database.ConnectRedis(cfg); err != nil {
		log.Fatalf("Redis bağlantısı kurulamadı: %v", err)
	}
	defer database.CloseRedis()

	// Servis ve handler örnekleri
	userService := services.NewUserService(database.GetDB())
	authHandler := handlers.NewAuthHandler(userService, cfg.CookieSecure)
	kycService := services.NewKYCService(database.GetDB())
	userHandler := handlers.NewUserHandler(userService, kycService)

	productService := services.NewProductService(database.GetDB())
	orderService := services.NewOrderService(database.GetDB())
	pendingPoolService := services.NewPendingPoolService(database.GetDB())
	walletService := services.NewWalletService(database.GetDB())
	chipService := services.NewChipService(database.GetDB())
	monthlyCloseService := services.NewMonthlyCloseService(database.GetDB(), chipService)
	packageService := services.NewPackageService(database.GetDB())
	dashboardService := services.NewDashboardService(database.GetDB())
	commissionService := services.NewCommissionService(database.GetDB())
	bankService := services.NewBankService(database.GetDB())
	beneficiaryService := services.NewBeneficiaryService(database.GetDB())
	retailService := services.NewRetailService(database.GetDB())
	binaryTransactionService := services.NewBinaryTransactionService(database.GetDB())
	sponsorTreeService := services.NewSponsorTreeService(database.GetDB())
	paymentNotificationService := services.NewPaymentNotificationService(database.GetDB())
	heroSlideService := services.NewHeroSlideService(database.GetDB())
	benefitService := services.NewBenefitService(database.GetDB())
	settingService := services.NewSettingService(database.GetDB())
	ticketService := services.NewTicketService(database.GetDB())
	auditService := services.NewAuditService(database.GetDB())
	adminStatsService := services.NewAdminStatsService(database.GetDB())
	treeAdminService := services.NewTreeAdminService(database.GetDB())
	jobService := services.NewJobService(database.GetDB())
	productHandler := handlers.NewProductHandler(productService)
	orderHandler := handlers.NewOrderHandler(orderService)
	pendingPoolHandler := handlers.NewPendingPoolHandler(pendingPoolService)
	walletHandler := handlers.NewWalletHandler(walletService)
	adminHandler := handlers.NewAdminHandler(walletService, chipService, monthlyCloseService, pendingPoolService, paymentNotificationService, userService, orderService, auditService, adminStatsService, kycService, treeAdminService, jobService)
	packageHandler := handlers.NewPackageHandler(packageService)
	dashboardHandler := handlers.NewDashboardHandler(dashboardService)
	commissionHandler := handlers.NewCommissionHandler(commissionService)
	treeHandler := handlers.NewTreeHandler(dashboardService)
	bankHandler := handlers.NewBankHandler(bankService)
	beneficiaryHandler := handlers.NewBeneficiaryHandler(beneficiaryService)
	retailHandler := handlers.NewRetailHandler(retailService)
	binaryTransactionHandler := handlers.NewBinaryTransactionHandler(binaryTransactionService)
	sponsorTreeHandler := handlers.NewSponsorTreeHandler(sponsorTreeService, userService)
	paymentNotificationHandler := handlers.NewPaymentNotificationHandler(paymentNotificationService)
	uploadHandler := handlers.NewUploadHandler()
	heroSlideHandler := handlers.NewHeroSlideHandler(heroSlideService)
	benefitHandler := handlers.NewBenefitHandler(benefitService)
	settingHandler := handlers.NewSettingHandler(settingService)
	ticketHandler := handlers.NewTicketHandler(ticketService)
	rankHandler := handlers.NewRankHandler()

	// Ortak admin yetki zinciri
	adminOnly := func() []gin.HandlerFunc {
		return []gin.HandlerFunc{middleware.AuthRequired(userService), middleware.AdminRequired(userService)}
	}
	// Kilitli işlemler (ağaç taşıma, manuel rütbe, manuel bakiye, PV düzeltme)
	// yalnızca super_admin rolüne açıktır (RBAC).
	superAdminOnly := func() []gin.HandlerFunc {
		return []gin.HandlerFunc{middleware.AuthRequired(userService), middleware.SuperAdminRequired(userService)}
	}

	// Gin router ve endpoint kayıtları
	router := gin.Default()
	// Reverse proxy arkasında (LiteSpeed) gerçek istemci IP'si X-Forwarded-For'dan
	// okunur; böylece rate limit (Redis) her kullanıcı IP'si için ayrı çalışır.
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatalf("Güvenilir proxy ayarı yapılamadı: %v", err)
	}

	// CORS: frontend origin'ine izin ver (env: CORS_ORIGINS, virgülle ayrılabilir)
	allowedOrigins := strings.Split(cfg.CORSOrigins, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}
	router.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-CSRF-Protection"},
		AllowCredentials: true,
	}))

	router.GET("/health", handlers.HealthCheck)

	// Yüklenen görsellerin (hero slider, dekont vb.) statik sunumu
	if err := os.MkdirAll("uploads", 0o700); err != nil {
		log.WithError(err).Warn("uploads klasörü oluşturulamadı")
	}
	router.Static("/uploads", "uploads")

	api := router.Group("/api")
	{
		// Public endpoint'ler
		api.POST("/auth/register", middleware.RateLimit(database.GetRedis(), "register", 10, time.Hour), authHandler.Register)
		api.POST("/auth/login", middleware.RateLimit(database.GetRedis(), "login", 5, time.Minute), authHandler.Login)
		api.POST("/auth/logout", authHandler.Logout)
		api.POST("/auth/forgot-password", middleware.RateLimit(database.GetRedis(), "forgot-password", 3, time.Minute), authHandler.ForgotPassword)
		api.POST("/auth/reset-password", middleware.RateLimit(database.GetRedis(), "reset-password", 5, time.Minute), authHandler.ResetPassword)
		api.GET("/referral/check", authHandler.CheckReferral)
		api.GET("/theme", authHandler.ThemeByLogin)
		api.POST("/tickets", middleware.AuthRequired(userService), ticketHandler.Create)
		api.GET("/products", productHandler.List)
		api.GET("/products/popular", productHandler.ListPopular)
		api.GET("/products/:id", productHandler.Get)
		api.GET("/packages", packageHandler.List)
		api.GET("/ranks", rankHandler.List)
		api.GET("/hero-slides", heroSlideHandler.List)
		api.GET("/benefits", benefitHandler.List)
		api.GET("/settings", settingHandler.Get)

		// JWT korumalı endpoint'ler
		protected := api.Group("/user")
		protected.Use(middleware.AuthRequired(userService))
		protected.GET("/me", userHandler.Me)
		protected.GET("/profile", userHandler.Profile)
		protected.GET("/lookup", userHandler.LookupByCode)
		protected.PUT("/profile-image", userHandler.UpdateProfileImage)
		protected.PUT("/theme", userHandler.UpdateTheme)
		protected.GET("/sponsored", userHandler.Sponsored)
		protected.GET("/career", userHandler.Career)
		protected.GET("/kyc", userHandler.ListMyKYC)
		protected.POST("/kyc", userHandler.SubmitKYC)

		api.POST("/auth/change-password", middleware.AuthRequired(userService), middleware.RateLimit(database.GetRedis(), "change-password", 5, 15*time.Minute), authHandler.ChangePassword)

		bankGroup := api.Group("/bank-accounts")
		bankGroup.Use(middleware.AuthRequired(userService))
		bankGroup.GET("", bankHandler.List)
		bankGroup.POST("", bankHandler.Create)
		bankGroup.PUT("/:id", bankHandler.Update)
		bankGroup.DELETE("/:id", bankHandler.Delete)

		beneficiaryGroup := api.Group("/beneficiaries")
		beneficiaryGroup.Use(middleware.AuthRequired(userService))
		beneficiaryGroup.GET("", beneficiaryHandler.List)
		beneficiaryGroup.POST("", beneficiaryHandler.Create)
		beneficiaryGroup.DELETE("/:id", beneficiaryHandler.Delete)

		// Admin endpoint'leri (JWT + admin rolü)
		adminProducts := api.Group("/products")
		adminProducts.Use(adminOnly()...)
		adminProducts.POST("", productHandler.Create)
		adminProducts.PUT("/:id", productHandler.Update)
		adminProducts.DELETE("/:id", productHandler.Delete)

		adminPackages := api.Group("/packages")
		adminPackages.Use(adminOnly()...)
		adminPackages.POST("", packageHandler.Create)
		adminPackages.PUT("/:id", packageHandler.Update)
		adminPackages.DELETE("/:id", packageHandler.Delete)

		adminHeroSlides := api.Group("/admin/hero-slides")
		adminHeroSlides.Use(adminOnly()...)
		adminHeroSlides.GET("", heroSlideHandler.ListAll)
		adminHeroSlides.POST("", heroSlideHandler.Create)
		adminHeroSlides.PUT("/:id", heroSlideHandler.Update)
		adminHeroSlides.DELETE("/:id", heroSlideHandler.Delete)

		adminBenefits := api.Group("/admin/benefits")
		adminBenefits.Use(adminOnly()...)
		adminBenefits.GET("", benefitHandler.ListAll)
		adminBenefits.POST("", benefitHandler.Create)
		adminBenefits.PUT("/:id", benefitHandler.Update)
		adminBenefits.DELETE("/:id", benefitHandler.Delete)

		adminTickets := api.Group("/admin/tickets")
		adminTickets.Use(adminOnly()...)
		adminTickets.GET("", ticketHandler.ListAll)

		adminSettings := api.Group("/admin/settings")
		adminSettings.Use(adminOnly()...)
		adminSettings.PUT("", settingHandler.Update)

		orders := api.Group("/orders")
		orders.Use(middleware.AuthRequired(userService))
		orders.POST("", orderHandler.Create)
		orders.GET("", orderHandler.List)
		orders.GET("/:id", orderHandler.Get)

		pendingPool := api.Group("/pending-pool")
		pendingPool.Use(middleware.AuthRequired(userService))
		pendingPool.GET("", pendingPoolHandler.List)
		pendingPool.POST("/place", pendingPoolHandler.Place)
		pendingPool.POST("/place-by-code", pendingPoolHandler.PlaceByCode)

		walletGroup := api.Group("/wallet")
		walletGroup.Use(middleware.AuthRequired(userService))
		walletGroup.GET("", walletHandler.Get)
		walletGroup.POST("/withdraw", walletHandler.CreateWithdraw)
		walletGroup.GET("/withdraw", walletHandler.ListWithdraws)

		adminWithdrawals := api.Group("/admin/withdrawals")
		adminWithdrawals.Use(adminOnly()...)
		adminWithdrawals.GET("", adminHandler.ListWithdrawals)
		adminWithdrawals.POST("/:id/approve", adminHandler.ApproveWithdrawal)
		adminWithdrawals.POST("/:id/reject", adminHandler.RejectWithdrawal)

		adminPending := api.Group("/admin/pending-pool")
		adminPending.Use(adminOnly()...)
		adminPending.GET("", adminHandler.ListPendingPool)
		adminPending.POST("/place", adminHandler.PlacePendingUser)

		monthlyCloseHandlers := append(adminOnly(), adminHandler.MonthlyClose)
		api.POST("/admin/monthly-close", monthlyCloseHandlers...)

		cronHandlers := append(adminOnly(), adminHandler.MonthlyReset)
		api.POST("/cron/monthly-reset", cronHandlers...)

		dashboard := api.Group("/dashboard")
		dashboard.Use(middleware.AuthRequired(userService))
		dashboard.GET("", dashboardHandler.Get)
		dashboard.GET("/summary", dashboardHandler.Summary)
		dashboard.GET("/team", dashboardHandler.Team)
		dashboard.GET("/commissions", dashboardHandler.Commissions)

		adminDashboardHandlers := append(adminOnly(), dashboardHandler.Admin)
		api.GET("/admin/dashboard", adminDashboardHandlers...)

		api.GET("/commissions", middleware.AuthRequired(userService), commissionHandler.List)
		api.GET("/tree", middleware.AuthRequired(userService), treeHandler.Get)
		api.GET("/user/card", middleware.AuthRequired(userService), dashboardHandler.UserCard)
		api.GET("/sponsor-tree", middleware.AuthRequired(userService), sponsorTreeHandler.Get)
		api.GET("/retail-earnings", middleware.AuthRequired(userService), retailHandler.Earnings)
		api.GET("/binary-transactions", middleware.AuthRequired(userService), binaryTransactionHandler.List)
		api.POST("/upload", middleware.AuthRequired(userService), middleware.RateLimit(database.GetRedis(), "upload", 20, time.Hour), uploadHandler.Upload)

		paymentNotifications := api.Group("/payment-notifications")
		paymentNotifications.Use(middleware.AuthRequired(userService))
		paymentNotifications.GET("", paymentNotificationHandler.List)
		paymentNotifications.POST("", paymentNotificationHandler.Create)

		adminPayments := api.Group("/admin/payment-notifications")
		adminPayments.Use(adminOnly()...)
		adminPayments.GET("", adminHandler.ListPaymentNotifications)
		adminPayments.POST("/:id/approve", adminHandler.ApprovePaymentNotification)
		adminPayments.POST("/:id/reject", adminHandler.RejectPaymentNotification)

		adminBinaryTransactions := append(adminOnly(), binaryTransactionHandler.ListAll)
		api.GET("/admin/binary-transactions", adminBinaryTransactions...)

		// Yönetim paneli genişletme endpoint'leri (üye, sipariş, cüzdan, ağaç,
		// denetim logları, raporlar, KYC, fraud — adminOnly/superAdminOnly korumalı)
		api.GET("/admin/users", append(adminOnly(), adminHandler.ListUsers)...)
		api.PUT("/admin/users/:id/rank", append(superAdminOnly(), adminHandler.UpdateUserRank)...)
		api.POST("/admin/users/:id/adjust-pv-cv", append(superAdminOnly(), adminHandler.AdjustPVAndCV)...)
		api.GET("/admin/orders", append(adminOnly(), adminHandler.ListOrders)...)
		api.PUT("/admin/orders/:id/status", append(adminOnly(), adminHandler.UpdateOrderStatus)...)
		api.PATCH("/admin/orders/:id/status", append(adminOnly(), adminHandler.UpdateOrderStatus)...)
		api.GET("/admin/wallet/:user_id", append(adminOnly(), adminHandler.AdminWallet)...)
		api.GET("/admin/wallet/:user_id/transactions", append(adminOnly(), adminHandler.AdminWalletTransactions)...)
		api.POST("/admin/wallet/adjust", append(superAdminOnly(), adminHandler.AdminWalletAdjust)...)
		api.POST("/admin/tree/move", append(superAdminOnly(), adminHandler.TreeMove)...)
		api.GET("/admin/audit-logs", append(adminOnly(), adminHandler.ListAuditLogs)...)
		api.GET("/admin/correction-logs", append(adminOnly(), adminHandler.ListCorrectionLogs)...)
		api.GET("/admin/binary-balance", append(adminOnly(), adminHandler.BinaryBalance)...)
		api.GET("/admin/top-earners", append(adminOnly(), adminHandler.TopEarners)...)
		api.POST("/admin/bonus/simulate", append(adminOnly(), adminHandler.SimulateBonus)...)
		api.POST("/admin/bonus/run", append(adminOnly(), adminHandler.RunBonusJob)...)
		api.GET("/admin/jobs", append(adminOnly(), adminHandler.ListJobs)...)
		api.GET("/admin/jobs/:id", append(adminOnly(), adminHandler.GetJob)...)
		api.GET("/admin/flashout", append(adminOnly(), adminHandler.GetFlashout)...)
		api.PUT("/admin/flashout", append(adminOnly(), adminHandler.SetFlashout)...)
		api.GET("/admin/flashout/logs", append(adminOnly(), adminHandler.FlashoutLogs)...)
		api.GET("/admin/kyc", append(adminOnly(), adminHandler.ListKYC)...)
		api.POST("/admin/kyc/:id/approve", append(adminOnly(), adminHandler.SetKYCStatus)...)
		api.POST("/admin/kyc/:id/reject", append(adminOnly(), adminHandler.SetKYCStatus)...)
		api.POST("/admin/fraud/scan", append(adminOnly(), adminHandler.FraudScan)...)
		api.GET("/admin/fraud/matches", append(adminOnly(), adminHandler.FraudMatches)...)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: router,
	}

	// Sunucuyu ayrı goroutine'de başlat
	go func() {
		log.Infof("Sunucu %s portunda başlatıldı", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Sunucu hatası: %v", err)
		}
	}()

	// SIGINT/SIGTERM sinyallerini dinle (graceful shutdown)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Kapanış sinyali alındı, sunucu kapatılıyor...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Errorf("Sunucu kapatılırken hata: %v", err)
	}

	log.Info("Sunucu kapatıldı")
}
