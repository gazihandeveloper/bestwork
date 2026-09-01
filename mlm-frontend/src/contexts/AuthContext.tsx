"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as apiService from "@/services/api";
import { BASE_PATH } from "@/lib/api";
import type { AuthResponse, User } from "@/services/api";

// Admin/süper admin ana sitede (bestwork) oturum açamaz — yalnızca izole
// panelden (bestmanager) girer.
const isStaffRole = (role?: string) => role === "admin" || role === "super_admin";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, sponsorIdentifier?: string, role?: "user" | "customer", phone?: string, profile?: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // HttpOnly cookie'deki oturumu sunucudan geri yükle.
  // /user/me/status herkese açık ve 401 fırlatmaz → konsol 401 hatası üretilmez.
  useEffect(() => {
    apiService
      .getSessionStatus()
      .then((d) =>
        setUser(d.authenticated && d.user && !isStaffRole(d.user.role) ? d.user : null)
      )
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const persistSession = useCallback((res: AuthResponse) => {
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (loginValue: string, password: string) => {
      const res = await apiService.loginUser(loginValue, password);
      if (isStaffRole(res.user?.role)) {
        // Ana siteden yönetici girişi engellendi — çerezi temizle, genel hata göster.
        void apiService.logoutUser().catch(() => {});
        throw new Error("Kullanıcı adı ve şifre tanınamadı");
      }
      return persistSession(res);
    },
    [persistSession]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, sponsorIdentifier?: string, role?: "user" | "customer", phone?: string, profile?: Record<string, unknown>) => {
      const res = await apiService.registerUser(name, email, password, sponsorIdentifier, role, phone, profile);
      return persistSession(res);
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    // Çıkış sonrası doğrudan anasayfaya dön; oturum arkada temizlenir.
    void apiService
      .logoutUser()
      .catch(() => {})
      .finally(() => {
        window.location.replace(BASE_PATH + "/");
      });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === "admin" || user?.role === "super_admin",
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
