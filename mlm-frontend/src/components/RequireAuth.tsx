"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { useAuth } from "@/hooks/useAuth";

// Sayfa koruması: giriş yapılmamışsa /login'e yönlendirir.
// adminOnly ile admin rolü de zorunlu kılınabilir.
export default function RequireAuth({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <>{children}</>;
}
