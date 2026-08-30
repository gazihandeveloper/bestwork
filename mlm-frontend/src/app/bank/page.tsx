"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { MaterialIcon } from "@/components/MaterialIcon";
import RequireAuth from "@/components/RequireAuth";
import AppSnackbar from "@/components/AppSnackbar";
import EmptyState from "@/components/EmptyState";
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getErrorMessage,
} from "@/services/api";
import type { BankAccount } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const schema = yup.object({
  bank_name: yup.string().required("Banka adı zorunludur"),
  iban: yup.string().min(15, "IBAN en az 15 karakter olmalıdır").max(42, "IBAN en fazla 34 karakter olmalıdır").required("IBAN zorunludur"),
  account_name: yup.string().required("Hesap sahibi zorunludur"),
});

type BankForm = yup.InferType<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs font-medium">{message}</p>;
}

function BankContent() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
    setSnackbar({ open: true, message, severity });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankForm>({ resolver: yupResolver(schema) });

  const load = () => {
    listBankAccounts()
      .then(setAccounts)
      .catch((err) => showSnackbar(getErrorMessage(err), "error"));
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (values: BankForm) => {
    try {
      await createBankAccount(values);
      showSnackbar("Banka hesabı eklendi.");
      reset();
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    reset({ bank_name: account.bank_name, iban: account.iban, account_name: account.account_name });
  };

  const onEdit = async (values: BankForm) => {
    if (!editing) return;
    try {
      await updateBankAccount(editing.id, values);
      showSnackbar("Banka hesabı güncellendi.");
      setEditing(null);
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  const onDelete = async (id: number) => {
    try {
      await deleteBankAccount(id);
      showSnackbar("Hesap pasife alındı.");
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  const inputCls = (hasError?: boolean) =>
    cn(hasError && "border-destructive focus-visible:ring-destructive/40");

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Banka Bilgilerim</h1>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Yeni hesap formu */}
        <div className="md:col-span-5">
          <div className="border-border bg-card rounded border p-4">
            <h2 className="mb-2.5 text-lg font-bold">Yeni Hesap Ekle</h2>
            <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-2.5">
              <div>
                <Input placeholder="Banka Adı" className={inputCls(!!errors.bank_name)} {...register("bank_name")} />
                <FieldError message={errors.bank_name?.message} />
              </div>
              <div>
                <Input placeholder="IBAN" className={inputCls(!!errors.iban)} {...register("iban")} />
                <FieldError message={errors.iban?.message} />
              </div>
              <div>
                <Input placeholder="Hesap Sahibi" className={inputCls(!!errors.account_name)} {...register("account_name")} />
                <FieldError message={errors.account_name?.message} />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Ekleniyor..." : "Ekle"}
              </Button>
            </form>
          </div>
        </div>

        {/* Hesaplar listesi */}
        <div className="md:col-span-7">
          <div className="border-border bg-card rounded border p-4">
            <h2 className="mb-2.5 text-lg font-bold">Hesaplarım ({accounts.length})</h2>
            {accounts.length === 0 && (
              <EmptyState icon={<MaterialIcon name="account_balance" size={48} />} message="Henüz banka hesabı eklemediniz." />
            )}
            {accounts.map((a) => (
              <div
                key={a.id}
                className="border-border flex items-center justify-between border-b py-1 last:border-b-0"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {a.bank_name}
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[10px]",
                        a.is_active ? "border-[#2E7D32]/50 text-[#2E7D32]" : "border-border text-muted-foreground"
                      )}
                    >
                      {a.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </p>
                  <p className="text-muted-foreground text-xs">{a.account_name} · {a.iban}</p>
                </div>
                <div className="flex items-center">
                  <button
                    aria-label="düzenle"
                    onClick={() => openEdit(a)}
                    className="text-primary hover:bg-primary/10 flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                  >
                    <MaterialIcon name="Pencil" className="size-4" />
                  </button>
                  <button
                    aria-label="sil"
                    onClick={() => onDelete(a.id)}
                    className="text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                  >
                    <MaterialIcon name="Trash2" className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Düzenleme dialogu */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-lg font-bold">Banka Hesabını Düzenle</DialogTitle>
          <form onSubmit={handleSubmit(onEdit)} className="flex flex-col gap-2.5">
            <div>
              <Input placeholder="Banka Adı" className={inputCls(!!errors.bank_name)} {...register("bank_name")} />
              <FieldError message={errors.bank_name?.message} />
            </div>
            <div>
              <Input placeholder="IBAN" className={inputCls(!!errors.iban)} {...register("iban")} />
              <FieldError message={errors.iban?.message} />
            </div>
            <div>
              <Input placeholder="Hesap Sahibi" className={inputCls(!!errors.account_name)} {...register("account_name")} />
              <FieldError message={errors.account_name?.message} />
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

export default function BankPage() {
  return (
    <RequireAuth>
      <BankContent />
    </RequireAuth>
  );
}
