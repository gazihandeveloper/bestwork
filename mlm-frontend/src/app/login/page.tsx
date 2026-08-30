"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginValue, password);
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 pt-[104px] pb-8 md:pt-[112px]">
      <div className="border-border bg-card w-full max-w-xs rounded-xl border p-6 shadow-sm">
        <h1 className="text-primary-dark text-xl font-bold">Giriş Yap</h1>
        <p className="text-muted-foreground mt-1 mb-3 text-sm">
          E-posta adresiniz veya üye numaranız (TR90XXXXXX) ile giriş yapın.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm font-medium">
              {error}
            </div>
          )}
          <Input
            placeholder="E-posta veya üye numarası"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
            {submitting ? (
              <>
                <MaterialIcon name="Loader2" className="size-4 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </Button>
        </form>

        <p className="mt-2 text-center text-sm">
          Hesabınız yok mu?{" "}
          <Link href="/register" className={cn("font-semibold text-[#2E7D32]")}>
            Kayıt olun
          </Link>
        </p>
      </div>
    </div>
  );
}
