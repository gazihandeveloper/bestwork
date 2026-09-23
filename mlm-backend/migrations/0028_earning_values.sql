-- Kazanç kalemlerinin değerlerini mevcut Bestwork motoruna göre doldurur.
-- (Kalıcı veri; admin panelinden sonradan değiştirilebilir.)

-- Referans: paket bazlı (max paket oranı %23), ürün bazlı, aylık, aktiflik yok, eşleşmeye dahil.
UPDATE earning_plans SET
  description = 'Doğrudan sponsor olduğunuz üyelerin sipariş CV''sinden, paketinizin referans oranı kadar anında kazanç.',
  max_rate = 23, scope = 'product', period = 'monthly', activity_mode = 'none', check_matching = TRUE, depth = 1
WHERE code = 'referral';

-- Binary: paket bazlı (max paket oranı %13), ağaç bazlı, aylık, kişisel aktiflik, eşleşmeye dahil.
UPDATE earning_plans SET
  description = 'Sol ve sağ bacaklarınızdaki CV''ler eşleştiğinde, paketinizin binary oranı kadar kazanç.',
  max_rate = 13, scope = 'tree', period = 'monthly', activity_mode = 'personal', check_matching = TRUE, depth = 0
WHERE code = 'binary';

-- Matching (Liderlik): 5 nesil, kariyer basamağına göre; ağaç bazlı, kişisel aktiflik, eşleşmeye dahil DEĞİL.
UPDATE earning_plans SET
  description = 'Ekibinizin binary kazancından, kariyer basamağınıza göre 5 nesle kadar %20/%10/%10/%10/%5 pay.',
  max_rate = 100, scope = 'tree', period = 'monthly', activity_mode = 'personal', check_matching = FALSE, depth = 5
WHERE code = 'matching';

-- Retail (Müşteri): paket referans oranıyla (max %23), ürün bazlı, aylık, aktiflik yok, eşleşmeye dahil DEĞİL.
UPDATE earning_plans SET
  description = 'Sizin sponsorluğunuzda üye olan müşterilerin siparişlerinden perakende kazancı.',
  max_rate = 23, scope = 'product', period = 'monthly', activity_mode = 'none', check_matching = FALSE, depth = 1
WHERE code = 'retail';

-- Kariyer: tek seferlik bonus, ağaç bazlı, aylık, aktiflik yok, eşleşmeye dahil DEĞİL.
UPDATE earning_plans SET
  payout_type = 'bonus',
  description = 'Yeni bir kariyer basamağına ilk kez ulaştığınızda tek seferlik kariyer primi.',
  max_rate = 100, scope = 'tree', period = 'monthly', activity_mode = 'none', check_matching = FALSE, depth = 0
WHERE code = 'career';

-- Matching oran matrisi: kariyer basamağına göre nesil oranları (%20/10/10/10/5).
-- Basamak = kendi rütbesinden küçük/eşit PV eşiği olan rütbe sayısı (en çok 5).
INSERT INTO earning_plan_rates (plan_id, rank_id, depth, rate)
SELECT p.id, r.id, d, (ARRAY[20,10,10,10,5])[d]
FROM earning_plans p
JOIN ranks r ON TRUE
CROSS JOIN generate_series(1,5) AS d
WHERE p.code = 'matching'
  AND d <= LEAST(5, (SELECT COUNT(*) FROM ranks r2 WHERE r2.required_left_pv <= r.required_left_pv))
ON CONFLICT (plan_id, rank_id, depth) DO UPDATE SET rate = EXCLUDED.rate;
