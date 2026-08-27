"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

// Sayfa koruması: giriş yapılmamışsa /login'e yönlendirir.
// adminOnly ile admin rolü de zorunlu kılınabilir.
export default function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && adminOnly && (!user || user.role !== "admin")) {
      router.replace("/dashboard");
    }
  }, [loading, user, adminOnly, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <>{children}</>;
}
