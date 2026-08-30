"use client";

import { useMemo, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { usePanelAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";
import ParticleField from "./ParticleField";

function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABEL = ["Çok zayıf", "Zayıf", "Orta", "İyi", "Güçlü"];
const STRENGTH_CLASS = ["", "on1", "on2", "on3", "on4"];

export default function LoginScreen() {
  const { login } = usePanelAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const canSubmit = loginValue.trim().length >= 3 && password.length >= 1 && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const u = await login(loginValue, password);
      if (u.role !== "admin" && u.role !== "super_admin") {
        setError("Bu panel yalnızca yöneticiler içindir.");
        setErrorKey((k) => k + 1);
      }
      // admin ise AuthGuard otomatik paneli açar
    } catch (err) {
      setError(getErrorMessage(err));
      setErrorKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lt-shell">
      <ParticleField />
      <div className="lt-orb lt-orb-1" />
      <div className="lt-orb lt-orb-2" />
      <div className="lt-orb lt-orb-3" />

      <div className="lt-card">
        <h1 className="lt-title">Güvenli Giriş</h1>
        <p className="lt-subtitle">İzole yönetim ortamına kimlik doğrulayın</p>

        <div className="lt-shield">
          <MaterialIcon name="ShieldCheck" size={15} /> Korumalı oturum · Şifreli bağlantı
        </div>

        {error && (
          <div key={errorKey} className="lt-error" role="alert">
            <MaterialIcon name="AlertTriangle" size={16} />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="lt-field">
            <span className="lt-icon">
              <MaterialIcon name="User" size={16} />
            </span>
            <input
              type="text"
              placeholder="E-posta veya üye numarası"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              autoFocus
              autoComplete="username"
              aria-label="E-posta veya üye numarası"
            />
          </div>

          <div className="lt-field">
            <span className="lt-icon">
              <MaterialIcon name="Lock" size={16} />
            </span>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Şifre"
            />
            <button
              type="button"
              className="lt-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
              tabIndex={-1}
            >
              {showPw ? <MaterialIcon name="EyeOff" size={17} /> : <MaterialIcon name="Eye" size={17} />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="lt-strength" aria-live="polite">
              <div className="bars">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={i <= strength ? STRENGTH_CLASS[strength] : ""} />
                ))}
              </div>
              <span className="lt-strength-label">{STRENGTH_LABEL[strength]}</span>
            </div>
          )}

          <button type="submit" className="lt-btn" disabled={!canSubmit}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Doğrulanıyor…
              </>
            ) : (
              <>
                <MaterialIcon name="login" size={16} className="me-2" />
                Güvenli Giriş
              </>
            )}
          </button>
        </form>

        <div className="lt-security">
          <span>
            <MaterialIcon name="ShieldCheck" size={12} /> 256-bit SSL
          </span>
          <span>
            <MaterialIcon name="Fingerprint" size={12} /> KVKK Uyumlu
          </span>
          <span>
            <MaterialIcon name="ScrollText" size={12} /> Denetim Kayıtlı
          </span>
        </div>
      </div>

      <div className="lt-foot">
        <MaterialIcon name="ShieldAlert" size={11} className="me-1" />
        BestWork MLM · Yetkisiz erişimler kayıt altına alınır
      </div>
    </div>
  );
}
