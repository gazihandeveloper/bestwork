"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Trash2, Users } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import { listBeneficiaries, createBeneficiary, deleteBeneficiary, getErrorMessage } from "@/services/api";
import type { Beneficiary } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const schema = yup.object({
  full_name: yup.string().required("Ad soyad zorunludur"),
  relationship: yup.string().required("Yakınlık derecesi zorunludur"),
  phone: yup.string().optional(),
  email: yup.string().email("Geçerli e-posta girin").optional(),
});

type BeneficiaryForm = yup.InferType<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs font-medium">{message}</p>;
}

function BeneficiaryContent() {
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BeneficiaryForm>({ resolver: yupResolver(schema) });

  const load = () => {
    listBeneficiaries()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values: BeneficiaryForm) => {
    setError("");
    setSuccess("");
    try {
      await createBeneficiary(values);
      setSuccess("Varis eklendi.");
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteBeneficiary(id);
      setSuccess("Varis silindi.");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const inputCls = (hasError?: boolean) =>
    cn(hasError && "border-destructive focus-visible:ring-destructive/40");

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Varis Bilgileri</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Kazançlarınızın devredileceği varislerinizi tanımlayın.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Yeni varis formu */}
        <div className="md:col-span-5">
          <div className="border-border bg-card rounded border p-4">
            <h2 className="mb-2.5 text-lg font-bold">Yeni Varis</h2>
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
                <Input placeholder="Ad Soyad" className={inputCls(!!errors.full_name)} {...register("full_name")} />
                <FieldError message={errors.full_name?.message} />
              </div>
              <div>
                <Input
                  placeholder="Yakınlık (Eş, Çocuk...)"
                  className={inputCls(!!errors.relationship)}
                  {...register("relationship")}
                />
                <FieldError message={errors.relationship?.message} />
              </div>
              <div>
                <Input placeholder="Telefon" className={inputCls(!!errors.phone)} {...register("phone")} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div>
                <Input placeholder="E-posta" type="email" className={inputCls(!!errors.email)} {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Ekleniyor..." : "Varis Ekle"}
              </Button>
            </form>
          </div>
        </div>

        {/* Varis listesi */}
        <div className="md:col-span-7">
          <div className="border-border bg-card rounded border p-4">
            <h2 className="mb-2.5 text-lg font-bold">Varislerim ({items.length})</h2>
            {items.length === 0 && (
              <EmptyState icon={<Users size={48} />} message="Henüz varis eklemediniz." />
            )}
            {items.map((b) => (
              <div
                key={b.id}
                className="border-border flex items-center justify-between border-b py-1 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-semibold">{b.full_name} · {b.relationship}</p>
                  <p className="text-muted-foreground text-xs">{b.phone || "-"} · {b.email || "-"}</p>
                </div>
                <button
                  aria-label="sil"
                  onClick={() => handleDelete(b.id)}
                  className="text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BeneficiaryPage() {
  return (
    <RequireAuth>
      <BeneficiaryContent />
    </RequireAuth>
  );
}
