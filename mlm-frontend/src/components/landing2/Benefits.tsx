"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Truck, ShieldCheck, Gift, Headphones } from "lucide-react";
import { listBenefits } from "@/services/api";
import type { Benefit } from "@/services/api";
import { Reveal } from "../landing/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

// İkon anahtarları (admin panelindeki seçimle eşleşir)
const ICONS: Record<string, ReactNode> = {
  shipping: <Truck className="size-5" />,
  payment: <ShieldCheck className="size-5" />,
  pv: <Gift className="size-5" />,
  support: <Headphones className="size-5" />,
};

const fallbackBenefits: Benefit[] = [
  { id: -1, title: "Kargo Bedava", description: "500 TL ve üzeri siparişlerde", icon: "shipping", sort_order: 1, is_active: true, created_at: "" },
  { id: -2, title: "Güvenli Ödeme", description: "EFT/HAVALE ile güvenli ödeme", icon: "payment", sort_order: 2, is_active: true, created_at: "" },
  { id: -3, title: "PV/CV Puan", description: "Her ürün seviye atlatır", icon: "pv", sort_order: 3, is_active: true, created_at: "" },
  { id: -4, title: "7/24 Destek", description: "Her zaman yanınızdayız", icon: "support", sort_order: 4, is_active: true, created_at: "" },
];

// Avantaj şeridi — içerik admin panelinden yönetilir (GET /api/benefits).
export default function Benefits() {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);

  useEffect(() => {
    let active = true;
    listBenefits()
      .then((bs) => {
        if (active) setBenefits(bs.length > 0 ? bs : fallbackBenefits);
      })
      .catch((err: unknown) => {
        console.error("Avantaj kartları yüklenemedi:", err);
        if (active) setBenefits(fallbackBenefits);
      });
    return () => {
      active = false;
    };
  }, []);

  if (benefits === null) {
    return (
      <section className="bg-background py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="avantajlar" className="bg-background py-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((item, i) => (
          <Reveal key={item.id} delay={i * 60} className="h-full">
            <div className="border-border bg-card shadow-sm flex h-full items-center gap-4 rounded border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="bg-gradient-to-br from-secondary-light to-secondary text-primary-dark flex size-12 shrink-0 items-center justify-center rounded-full">
                {ICONS[item.icon] ?? ICONS.shipping}
              </div>
              <div className="min-w-0">
                <h3 className="text-[0.95rem] leading-[1.3] font-bold break-words">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-[0.8rem] leading-[1.35] break-words">
                  {item.description}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
