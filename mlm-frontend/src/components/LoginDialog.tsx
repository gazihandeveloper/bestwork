"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BASE_PATH, getErrorMessage } from "@/lib/api";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NEXT_KEY = "bestwork_login_next";

type ResetStep = "request" | "reset" | "done";

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

  // Şifre sıfırlama durumu
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [resetLogin, setResetLogin] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetInfo, setResetInfo] = useState("");

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

  // Adım 1: kod iste
  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetInfo("");
    setResetSubmitting(true);
    try {
      const { data } = await api.post<{ ok: boolean; code?: string }>("/auth/forgot-password", {
        login: resetLogin.trim(),
      });
      if (data.ok && data.code) {
        setResetInfo(`Sıfırlama kodunuz: ${data.code}`);
      } else {
        setResetInfo("E-posta, üye numarası veya telefonunuzla eşleşen hesap bulunamadı.");
      }
      setResetStep("reset");
    } catch (err) {
      setResetError(getErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  };

  // Adım 2: kodu doğrula + yeni şifre
  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 8) {
      setResetError("Yeni şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (newPassword !== newPassword2) {
      setResetError("Şifreler eşleşmiyor.");
      return;
    }
    setResetSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        login: resetLogin.trim(),
        code: resetCode.trim(),
        new_password: newPassword,
      });
      setResetStep("done");
    } catch (err) {
      setResetError(getErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  };

  const resetDialogTitle = () => {
    if (resetStep === "request") return "Şifremi Unuttum";
    if (resetStep === "reset") return "Yeni Şifre Belirle";
    return "Şifre Sıfırlandı";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-6">
        <DialogTitle className="text-center text-xl font-bold">
          {resetStep === "request" ? "Giriş Yap" : resetDialogTitle()}
        </DialogTitle>
        <p className="text-muted-foreground text-center text-sm">
          {resetStep === "request"
            ? "E-posta adresiniz, üye numaranız veya telefon numaranızla devam edin."
            : "Hesabınızın şifresini sıfırlayın."}
        </p>

        {resetStep === "request" ? (
          <>
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

            <div className="border-border mt-3 border-t pt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setResetStep("request");
                  setResetLogin("");
                  setResetError("");
                  setResetInfo("");
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-semibold underline underline-offset-2 transition-colors"
              >
                Şifremi unuttum
              </button>
            </div>
          </>
        ) : resetStep === "reset" ? (
          <form onSubmit={confirmReset} className="flex flex-col gap-3">
            {resetError && (
              <div className="border-destructive/50 bg-destructive/10 text-destructive rounded border px-3 py-2 text-sm font-medium">
                {resetError}
              </div>
            )}
            {resetInfo && (
              <div className="border-[#2E7D32]/50 bg-[#2E7D32]/10 text-[#2E7D32] flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium">
                <MailCheck className="size-4 shrink-0" />
                {resetInfo}
              </div>
            )}
            <div>
              <Input
                placeholder="E-posta · üye no · telefon"
                value={resetLogin}
                onChange={(e) => setResetLogin(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                placeholder="Sıfırlama kodu"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
                inputMode="numeric"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Yeni şifre (en az 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Yeni şifre (tekrar)"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" disabled={resetSubmitting} className="w-full">
              {resetSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sıfırlanıyor...
                </>
              ) : (
                "Şifreyi Sıfırla"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setResetStep("request")}
              className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-center gap-1 text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Geri dön
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="bg-[#2E7D32]/10 flex size-14 items-center justify-center rounded-full">
              <ShieldCheck className="text-[#2E7D32] size-7" />
            </div>
            <p className="font-semibold">Şifreniz başarıyla sıfırlandı.</p>
            <p className="text-muted-foreground text-sm">Yeni şifrenizle giriş yapabilirsiniz.</p>
            <Button
              size="lg"
              className="mt-1 w-full"
              onClick={() => {
                setResetStep("request");
                setPassword("");
                setLoginValue(resetLogin);
              }}
            >
              Giriş Yap
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
