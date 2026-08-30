"use client";

import type { ReactNode } from "react";
import { usePanelAuth } from "@/lib/auth";
import LoginScreen from "./LoginScreen";

// Admin değilse giriş ekranı, admin ise panel içeriği.
export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = usePanelAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: "2.6rem", height: "2.6rem" }} />
          <div className="text-muted mt-2">Panel hazırlanıyor…</div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
