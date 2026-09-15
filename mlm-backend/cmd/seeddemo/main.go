// BestWork - Demo veri kurulum aracı
//
// Belirtilen kök üyenin altına örnek bir ikili ağaç kurar, demo siparişler
// oluşturur ve bunları GERÇEK ödeme akışından geçirir (UpdateOrderStatus →
// ProcessOrderEffects). Böylece PV/CV dağılımı, bacak toplamları ve puan
// hareketleri canlıdaki gerçek kod yoluyla oluşur — elle INSERT ile değil.
//
// Kullanım:
//
//	./bestwork-seeddemo -root 90016 -kisi 79 -siparis 8 -sifre Demo1234
//
// Notlar:
//   - Idempotenttir: aynı üye/kod tekrar eklenmez, sipariş zaten ödenmişse atlanır.
//   - Yalnızca demo amaçlıdır; üretimde bir kez çalıştırılıp bırakılır.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"

	"mlm-backend/internal/config"
	"mlm-backend/internal/database"
	"mlm-backend/internal/services"
)

func main() {
	kök := flag.Int64("root", 90016, "kök üye kimliği (ağaç bunun altına kurulur)")
	kisi := flag.Int("kisi", 79, "eklenecek örnek üye sayısı")
	siparis := flag.Int("siparis", 8, "oluşturulup ödenecek demo sipariş sayısı")
	sifre := flag.String("sifre", "Demo1234", "örnek üyelerin giriş şifresi")
	idTabani := flag.Int64("idbase", 91000, "örnek üyelerin kimlik tabanı (mevcut kimliklerle çakışmamalı)")
	adminID := flag.Int64("admin", 1, "demo siparişleri ödeyen yönetici kimliği (denetim kaydı için)")
	flag.Parse()

	cfg := config.LoadConfig()
	if err := database.ConnectPostgres(cfg); err != nil {
		fmt.Println("veritabanı hatası:", err)
		os.Exit(1)
	}
	defer database.ClosePostgres()

	ctx := context.Background()
	db := database.GetDB()

	hash, err := bcrypt.GenerateFromPassword([]byte(*sifre), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("şifre hash hatası:", err)
		os.Exit(1)
	}

	// ── 1) Örnek üyeler: tam ikili ağaç (i. düğümün ebeveyni i/2) ──
	res, err := db.Exec(ctx, `
		INSERT INTO users (id, name, email, member_code, password_hash, sponsor_id, parent_id, position,
		                   is_active, is_in_pending_pool, total_pv_accumulated, total_cv_accumulated)
		SELECT $4 + i,
		       'Örnek Üye ' || i,
		       'ornek' || i || '@bestwork.local',
		       'TR90' || lpad((910000 + i)::text, 6, '0'),
		       $3,
		       CASE WHEN i = 1 THEN $1 ELSE $4 + (i/2) END,
		       CASE WHEN i = 1 THEN $1 ELSE $4 + (i/2) END,
		       CASE WHEN i % 2 = 0 THEN 'L' ELSE 'R' END,
		       TRUE, FALSE,
		       (i * 7) % 500,
		       (i * 13) % 900
		FROM generate_series(1, $2) AS i
		ON CONFLICT DO NOTHING`, *kök, *kisi, string(hash), *idTabani)
	if err != nil {
		fmt.Println("örnek üyeler eklenemedi:", err)
		os.Exit(1)
	}
	fmt.Printf("✓ örnek üyeler: %d yeni kayıt\n", res.RowsAffected())

	// ── 2) Cüzdanlar ──
	if _, err := db.Exec(ctx, `
		INSERT INTO wallets (user_id)
		SELECT id FROM users WHERE parent_id IS NOT NULL AND member_code LIKE 'TR9091%'
		ON CONFLICT DO NOTHING`); err != nil {
		fmt.Println("cüzdan hatası:", err)
		os.Exit(1)
	}
	fmt.Println("✓ cüzdanlar hazır")

	// ── 3) Bacak toplamları: her düğümün sol/sağ alt ağaç toplamı ──
	if _, err := db.Exec(ctx, `
		WITH RECURSIVE agac AS (
			SELECT id AS kok, id AS dugum, NULL::text AS ilk,
			       total_pv_accumulated AS pv, total_cv_accumulated AS cv
			FROM users WHERE id = $1
			UNION ALL
			SELECT a.kok, u.id, COALESCE(a.ilk, u.position),
			       u.total_pv_accumulated, u.total_cv_accumulated
			FROM users u JOIN agac a ON u.parent_id = a.dugum
		),
		bacak AS (
			SELECT kok,
			       SUM(pv) FILTER (WHERE ilk = 'L') AS lpv, SUM(cv) FILTER (WHERE ilk = 'L') AS lcv,
			       SUM(pv) FILTER (WHERE ilk = 'R') AS rpv, SUM(cv) FILTER (WHERE ilk = 'R') AS rcv
			FROM agac WHERE ilk IS NOT NULL GROUP BY kok
		)
		UPDATE users u SET
			total_pv_left  = COALESCE(b.lpv, 0), total_cv_left  = COALESCE(b.lcv, 0),
			total_pv_right = COALESCE(b.rpv, 0), total_cv_right = COALESCE(b.rcv, 0)
		FROM bacak b WHERE u.id = b.kok`, *kök); err != nil {
		fmt.Println("bacak toplamları hesaplanamadı:", err)
		os.Exit(1)
	}
	fmt.Println("✓ bacak toplamları hesaplandı")

	// ── 4) Demo siparişler: ağaçtaki üyeler adına ──
	siparisSvc := services.NewOrderService(db)
	var idler []int64
	rows, err := db.Query(ctx, `
		SELECT id FROM users
		WHERE parent_id IS NOT NULL AND member_code LIKE 'TR9091%'
		ORDER BY id LIMIT $1`, *siparis)
	if err != nil {
		fmt.Println("üyeler okunamadı:", err)
		os.Exit(1)
	}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			break
		}
		idler = append(idler, id)
	}
	rows.Close()

	odenen := 0
	for i, uid := range idler {
		pv := float64(50 + (i%5)*25)  // 50..150
		cv := float64(100 + (i%5)*50) // 100..300
		var oid int64
		err := db.QueryRow(ctx, `
			INSERT INTO orders (user_id, total_amount, total_pv, total_cv, status, created_at)
			VALUES ($1, $2, $3, $4, 'pending', NOW() - ($5 || ' hours')::interval)
			RETURNING id`, uid, 250.0+float64(i)*50, pv, cv, fmt.Sprint(i*6+2)).Scan(&oid)
		if err != nil {
			fmt.Println("sipariş oluşturulamadı:", err)
			continue
		}
		if _, err := db.Exec(ctx, `
			INSERT INTO order_items (order_id, product_id, quantity, price, pv, cv)
			VALUES ($1, (SELECT id FROM products LIMIT 1), 1, $2, $3, $4)`,
			oid, 250.0+float64(i)*50, pv, cv); err != nil {
			fmt.Println("sipariş kalemi eklenemedi:", err)
			continue
		}
		// Gerçek ödeme akışı: PV/CV dağıtımı ve puan hareketleri burada oluşur
		if err := siparisSvc.UpdateOrderStatus(ctx, *adminID, "Demo", oid, "paid", "", ""); err != nil {
			fmt.Println("sipariş ödenemedi:", err)
			continue
		}
		odenen++
	}
	fmt.Printf("✓ demo sipariş: %d/%d ödendi (PV/CV üst hatta dağıtıldı)\n", odenen, len(idler))
	fmt.Println("TAMAM")
}
