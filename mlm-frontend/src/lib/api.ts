import axios from "axios";

// Ortak axios istemcisi: HttpOnly oturum cookie'sini gönderir, 401'de oturumu düşürür.
// Yerel geliştirmede /api → canlı API'ye proxy'lenir (next.config rewrites) — böylece
// oturum çerezi localhost domain'inde kalır, giriş sonrası geri atma yaşanmaz.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "/api" : "http://localhost:8080/api");

// Uygulamanın yayınlandığı alt yol (üretimde "/mlm", yerelde "").
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// pathUnderBase basePath'li yolu basePath'siz hale getirir ("/mlm/login" -> "/login").
function pathUnderBase(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(BASE_PATH + "/")) return pathname.slice(BASE_PATH.length);
  return pathname;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      // Çıkış isteğinde 401 yönlendirme yapma (logout anasayfaya döner).
      const reqUrl = error?.config?.url || "";
      if (reqUrl.includes("/auth/logout")) {
        return Promise.reject(error);
      }
      const path = pathUnderBase(window.location.pathname);
      // Herkese açık sayfalar: oturum yokluğunda yönlendirme yapma.
      // /product ürün detayı da herkese açıktır (mağaza vitrini); satın alma login ister.
      const publicPaths = ["/", "/login", "/register", "/shop", "/product"];
      const isPublicPage = publicPaths.some(
        (p) => path === p || path.startsWith(p + "/")
      );
      if (!isPublicPage && path !== "/login") {
        window.location.replace(BASE_PATH + "/login");
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 500) {
      return "Bir sorun oluştu";
    }
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || "Bir sorun oluştu";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Bir sorun oluştu";
}
