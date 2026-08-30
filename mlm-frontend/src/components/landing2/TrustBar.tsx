"use client";

import { useEffect, useState } from "react";
import { MaterialIcon, materialName } from "@/components/MaterialIcon";
import { listBenefits } from "@/services/api";
import type { Benefit } from "@/services/api";

// Eski kayıtlardaki anahtarlar → lucide adları
const ICON_ALIAS: Record<string, string> = {
  shipping: "truck",
  payment: "shield-check",
  pv: "gift",
  support: "headphones",
};

const toPascal = (name: string) =>
  name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

function TrustIcon({ name }: { name: string }) {
  const resolved = ICON_ALIAS[name] ?? name;
  return <MaterialIcon name={materialName(toPascal(resolved))} className="size-7" />;
}

const fallbackBenefits: Benefit[] = [
  { id: -1, title: "Kargo Bedava", description: "500 TL ve üzeri siparişlerde", icon: "shipping", sort_order: 1, is_active: true, created_at: "" },
  { id: -2, title: "Güvenli Ödeme", description: "EFT/HAVALE ile güvenli ödeme", icon: "payment", sort_order: 2, is_active: true, created_at: "" },
  { id: -3, title: "PV/CV Puan", description: "Her ürün seviye atlatır", icon: "pv", sort_order: 3, is_active: true, created_at: "" },
  { id: -4, title: "7/24 Destek", description: "Her zaman yanınızdayız", icon: "support", sort_order: 4, is_active: true, created_at: "" },
];

// Güven şeridi — içerik DB'den (GET /api/benefits) gelir; şerit görünümünde listelenir.
export default function TrustBar() {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);

  useEffect(() => {
    let active = true;
    listBenefits()
      .then((bs) => {
        if (active) setBenefits(bs.length > 0 ? bs : fallbackBenefits);
      })
      .catch((err: unknown) => {
        console.error("Avantaj şeridi yüklenemedi:", err);
        if (active) setBenefits(fallbackBenefits);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = benefits ?? fallbackBenefits;

  return (
    <section
      aria-label="Güven ve hizmet garantileri"
      className="border-b border-border/60 bg-background pt-2 pb-6 md:pt-3 md:pb-8"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/60">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-2 text-center md:flex-row md:items-center md:gap-3.5 md:px-5 md:text-left"
          >
            <span className="shrink-0 text-primary"><TrustIcon name={item.icon} /></span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">{item.title}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{item.description}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
