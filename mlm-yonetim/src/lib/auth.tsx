"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { getMe, loginUser, logoutUser, getErrorMessage, type AdminUser } from "@/lib/api";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (login: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function usePanelAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("usePanelAuth, AuthProvider içinde kullanılmalıdır");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Mount'ta oturumu geri yükle (HttpOnly cookie üzerinden)
  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const u = await loginUser(loginValue, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      /* yoksay */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = user?.role === "admin" || user?.role === "super_admin";
    const isSuperAdmin = user?.role === "super_admin";
    return { user, loading, isAdmin, isSuperAdmin, login, logout };
  }, [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { getErrorMessage };
