package services

import (
	"context"
	"fmt"
	"strings"

	"mlm-backend/internal/models"
)

// DownlineFiltre — Data Grid'in sorgu parametreleri.
//
// NEDEN AYRI UÇ: Ağaç uçları düğüm bazlıdır (/tree/level: 1 düğüm + 2 çocuk).
// "Sol bacağımda bu hafta aktif olmayanlar" gibi sorular için ise alt hattın
// DÜZ liste hâlinde, filtrelenebilir, sıralanabilir ve SAYFALANMIŞ olması
// gerekir; yüz binlerce satır tarayıcıya tek seferde gönderilemez.
type DownlineFiltre struct {
	// Bacak: "" (tümü) | "L" | "R" — kökün birinci seviye kolu
	Bacak string
	// Durum: "" (tümü) | "aktif" | "pasif"
	Durum string
	// Arama: isim veya üye kodu (en az 2 karakter)
	Arama string
	// Sıralama: "ad" | "pv" | "cv" | "tarih" | "seviye"
	Siralama string
	Limit    int
	Offset   int
}

// altHatCTE — kökün altındaki tüm üyeleri seviye ve ilk bacak bilgisiyle
// üreten recursive CTE. `ilk_bacak`, kökün ALTINDAKİ birinci seviye kolun
// hangisi olduğunu taşır; "sol bacak" filtresi bunun üzerinden çalışır.
const altHatCTE = `
WITH RECURSIVE alt AS (
    SELECT u.id, u.position, 1 AS seviye, u.position AS ilk_bacak
    FROM users u
    WHERE u.parent_id = $1
  UNION ALL
    SELECT c.id, c.position, a.seviye + 1, a.ilk_bacak
    FROM users c
    JOIN alt a ON c.parent_id = a.id
)`

// ListBinaryDownline — kökün binary alt hattını filtrelenmiş/sıralanmış/
// sayfalanmış olarak döndürür ve toplam kayıt sayısını verir.
func (s *DashboardService) ListBinaryDownline(
	ctx context.Context, kokID int64, f DownlineFiltre,
) ([]models.DownlineRow, int64, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	/* Filtreler tek yerde kurulur; hem sayım hem sayfa sorgusu aynı koşulu
	   kullanır (aksi hâlde "toplam" ile liste tutarsız olur). */
	kosul := []string{"1=1"}
	args := []any{kokID}
	arg := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}

	switch strings.ToUpper(strings.TrimSpace(f.Bacak)) {
	case "L", "R":
		kosul = append(kosul, "a.ilk_bacak = "+arg(strings.ToUpper(strings.TrimSpace(f.Bacak))))
	}
	switch strings.ToLower(strings.TrimSpace(f.Durum)) {
	case "aktif":
		kosul = append(kosul, "u.is_active = TRUE")
	case "pasif":
		kosul = append(kosul, "u.is_active = FALSE")
	}
	if q := strings.TrimSpace(f.Arama); len(q) >= 2 {
		p := arg("%" + q + "%")
		kosul = append(kosul, "(u.name ILIKE "+p+" OR u.member_code ILIKE "+p+")")
	}
	nerede := strings.Join(kosul, " AND ")

	/* Sıralama: beyaz liste — kullanıcı girdisi asla SQL'e gömülmez. */
	sirala := "u.name ASC"
	switch strings.ToLower(strings.TrimSpace(f.Siralama)) {
	case "pv":
		sirala = "u.total_pv_accumulated DESC, u.id"
	case "cv":
		sirala = "u.total_cv_accumulated DESC, u.id"
	case "tarih":
		sirala = "u.created_at DESC, u.id"
	case "seviye":
		sirala = "a.seviye ASC, u.name ASC"
	}

	var toplam int64
	if err := s.db.QueryRow(ctx,
		altHatCTE+" SELECT COUNT(*) FROM alt a JOIN users u ON u.id = a.id WHERE "+nerede,
		args...,
	).Scan(&toplam); err != nil {
		return nil, 0, fmt.Errorf("alt hat sayılamadı: %w", err)
	}

	/* created_at SQL'de metne çevrilir: pgx, timestamp'i doğrudan string'e
	   tarayamaz (OID 1114 hatası). Alan yalnızca listede gösterim amaçlıdır. */
	sayfaArgs := append(append([]any{}, args...), f.Limit, f.Offset)
	sorgu := altHatCTE + `
	SELECT u.id, u.name, u.member_code, u.position, p.name, r.name,
	       u.profile->>'profile_image',
	       u.total_pv_accumulated, u.total_cv_accumulated,
	       u.is_active, to_char(u.created_at, 'YYYY-MM-DD'), a.seviye, a.ilk_bacak
	FROM alt a
	JOIN users u ON u.id = a.id
	LEFT JOIN packages p ON p.id = u.package_id
	LEFT JOIN ranks r ON r.id = u.current_rank_id
	WHERE ` + nerede + `
	ORDER BY ` + sirala + `
	LIMIT $` + fmt.Sprint(len(args)+1) + ` OFFSET $` + fmt.Sprint(len(args)+2)

	rows, err := s.db.Query(ctx, sorgu, sayfaArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("alt hat listelenemedi: %w", err)
	}
	defer rows.Close()

	liste := make([]models.DownlineRow, 0, f.Limit)
	for rows.Next() {
		var d models.DownlineRow
		if err := rows.Scan(
			&d.UserID, &d.Name, &d.MemberCode, &d.Position, &d.Package, &d.Rank, &d.ImagePath,
			&d.TotalPVAccumulated, &d.TotalCVAccumulated, &d.IsActive, &d.CreatedAt,
			&d.Seviye, &d.IlkBacak,
		); err != nil {
			return nil, 0, fmt.Errorf("alt hat satırı okunamadı: %w", err)
		}
		liste = append(liste, d)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("alt hat okunamadı: %w", err)
	}
	return liste, toplam, nil
}
