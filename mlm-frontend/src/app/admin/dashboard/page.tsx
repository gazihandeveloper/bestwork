"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Eski admin paneli girişi → artık yönetim ana sayfası üye dashboard'unun içinde (AdminHome).
export default function AdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="text-primary size-10 animate-spin" />
    </div>
  );
}
