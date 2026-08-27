"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BASE_PATH, getErrorMessage } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NEXT_KEY = "bestwork_login_next";

// Global giriş modalı — "open-login" olayıyla her sayfada açılır.
// Sade ve düz tasarım: gradyan yok, gölge yok, köşeli (rounded).
export default function LoginDialog() {
  const { login } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const openHandler = () => {
      setError("");
      setLoginValue("");
      setPassword("");
      setOpen(true);
    };
    window.addEventListener("open-login", openHandler);
    return () => window.removeEventListener("open-login", openHandler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginValue, password);
      setOpen(false);
      const next = window.localStorage.getItem(NEXT_KEY);
      window.localStorage.removeItem(NEXT_KEY);
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        // Giriş yapar yapmaz dashboard'a git
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-6">
        <DialogTitle className="text-center text-xl font-bold">Giriş Yap</DialogTitle>
        <p className="text-muted-foreground text-center text-sm">
          E-posta adresiniz, üye numaranız veya telefon numaranızla devam edin.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded border px-3 py-2 text-sm font-medium">
              {error}
            </div>
          )}
          <div>
            <Input
              autoFocus
              placeholder="E-posta · üye no · telefon"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </Button>
        </form>

        <p className="mt-2 text-center text-sm">
          Hesabınız yok mu?{" "}
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className={cn("font-bold text-[#2E7D32]")}
          >
            Kayıt olun
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
