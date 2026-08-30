// Site ayarları (kurumsal içerik + footer telif hakkı vb.).
// Endpoint: GET /api/settings -> {settings:{key:value,...}}
// NOT: src/services/api.ts'e DOKUNMADAN bu modül üzerinden okunur (footer/landing ekibi).
// Base URL, src/lib/api.ts'deki desenle birebir aynıdır: NEXT_PUBLIC_API_URL "/api" son eki
// dahil kullanılır ve yol eklenir (ör. "https://host/api" + "/settings" -> ".../api/settings").

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "/api" : "http://localhost:8080/api");

const SETTINGS_URL = `${API_URL.replace(/\/+$/, "")}/settings`;

/**
 * Panelden düzenlenen site ayarlarını getirir (sunucu bileşenlerinde kullanılır).
 * Hata durumunda ASLA fırlatmaz: boş obje döner, böylece footer yine de render edilir.
 */
export async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(SETTINGS_URL, {
      // Paneldeki değişiklikler bir sonraki istekte anında yansısın (önbellek yok).
      cache: "no-store",
      // Backend yanıt vermezse site render'ını 5 saniyeden fazla bloklama.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { settings?: unknown };
    return data.settings && typeof data.settings === "object"
      ? (data.settings as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}
