"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Scope": "1" },
        credentials: "include",
        body: JSON.stringify({ login: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        setError(data?.error || "Geçersiz giriş bilgileri");
        return;
      }
      const role = data.user?.role;
      if (role !== "admin" && role !== "super_admin") {
        setError("Bu panele yalnızca yöneticiler girebilir.");
        return;
      }
      // Başarılı: panele yönlendir
      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="text-center mb-8">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: "rgb(41, 165, 108)" }}>
          BestWork
          <span className="text-[0.6em] text-gray-700 font-bold ml-0.5 align-super">®</span>
        </span>
        <p className="mt-1 text-[11px] font-bold tracking-[0.25em] text-gray-400 uppercase">
          Yönetim Merkezi
        </p>
        <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-white">Giriş Yap</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          E-posta ve şifrenizle devam edin
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm font-medium text-error-600 dark:text-error-400">
              {error}
            </div>
          )}
          <div>
            <Label>
              E-posta veya üye adı <span className="text-error-500">*</span>{" "}
            </Label>
            <Input
              placeholder="admin@bestwork.com"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label>
              Şifre <span className="text-error-500">*</span>{" "}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                Beni hatırla
              </span>
            </div>
            <Link
              href="/signin"
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Şifremi unuttum
            </Link>
          </div>
          <div>
            <Button className="w-full" size="sm" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
