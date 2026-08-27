"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { changePassword, getErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const schema = yup.object({
  oldPassword: yup.string().required("Mevcut şifre zorunludur"),
  newPassword: yup.string().min(12, "Yeni şifre en az 12 karakter olmalıdır").max(72, "Yeni şifre en fazla 72 karakter olmalıdır").required("Yeni şifre zorunludur"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Şifreler eşleşmiyor")
    .required("Yeni şifreyi tekrar girin"),
});

type ChangePasswordForm = yup.InferType<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs font-medium">{message}</p>;
}

function ChangePasswordContent() {
  const { logout } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: ChangePasswordForm) => {
    setError("");
    setSuccess("");
    try {
      await changePassword(values.oldPassword, values.newPassword);
      setSuccess("Şifreniz değiştirildi.");
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const inputCls = (hasError?: boolean) =>
    cn(hasError && "border-destructive focus-visible:ring-destructive/40");

  return (
    <div className="flex justify-center py-6">
      <div className="border-border bg-card w-full max-w-xs rounded border p-4">
        <h1 className="text-primary-dark text-xl font-bold">Şifre Değiştir</h1>
        <p className="text-muted-foreground mb-3 text-sm">
          Güvenliğiniz için mevcut şifrenizi doğrulayın.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded border px-3 py-2 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="border-[#2E7D32]/50 bg-[#2E7D32]/10 text-[#2E7D32] rounded border px-3 py-2 text-sm font-medium">
              {success}
            </div>
          )}
          <div>
            <Input
              type="password"
              placeholder="Mevcut Şifre"
              className={inputCls(!!errors.oldPassword)}
              {...register("oldPassword")}
            />
            <FieldError message={errors.oldPassword?.message} />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Yeni Şifre"
              className={inputCls(!!errors.newPassword)}
              {...register("newPassword")}
            />
            <FieldError message={errors.newPassword?.message} />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Yeni Şifre (Tekrar)"
              className={inputCls(!!errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
          </Button>
          <Button variant="ghost" className="text-destructive w-full" onClick={logout}>
            Çıkış Yap
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <RequireAuth>
      <ChangePasswordContent />
    </RequireAuth>
  );
}
