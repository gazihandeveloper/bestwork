import axios from "axios";

// Ortak axios istemcisi: HttpOnly oturum cookie'sini gönderir, 401'de oturumu düşürür.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      // Herkese açık sayfalar: oturum yokluğunda yönlendirme yapma.
      const publicPaths = ["/", "/login", "/register", "/shop"];
      const isPublicPage = publicPaths.some(
        (p) => window.location.pathname === p || window.location.pathname.startsWith(p + "/")
      );
      if (!isPublicPage && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || error.message || "Beklenmeyen bir hata oluştu";
  }
  return "Beklenmeyen bir hata oluştu";
}
