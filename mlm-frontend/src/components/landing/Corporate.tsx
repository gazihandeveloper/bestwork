"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getSettings } from "@/services/api";
import { Reveal } from "./Reveal";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_SETTINGS: Record<string, string> = {
  corporate_title: "Kurumsal",
  corporate_description:
    "BestWork, Binary MLM komisyon sistemi ile e-ticareti tek çatıda buluşturan modern bir platformdur.",
  corporate_address: "İstanbul, Türkiye",
  corporate_phone: "0850 000 00 00",
  corporate_email: "destek@bestwork.com",
  corporate_hours: "Pzt - Cmt: 09.00 - 18.00",
};

const contactItems = [
  { key: "corporate_address", label: "Adres", icon: <MaterialIcon name="MapPin" className="size-5" /> },
  { key: "corporate_phone", label: "Telefon", icon: <MaterialIcon name="Phone" className="size-5" /> },
  { key: "corporate_email", label: "E-posta", icon: <MaterialIcon name="Mail" className="size-5" /> },
  { key: "corporate_hours", label: "Çalışma Saatleri", icon: <MaterialIcon name="Clock" className="size-5" /> },
];

// Kurumsal bölümü — içerik DB'den (GET /api/settings) gelir, admin panelinden düzenlenir.
export default function Corporate() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (active) setSettings({ ...DEFAULT_SETTINGS, ...s });
      })
      .catch((err: unknown) => {
        console.error("Kurumsal içerik yüklenemedi:", err);
        if (active) setSettings(DEFAULT_SETTINGS);
      });
    return () => {
      active = false;
    };
  }, []);

  if (settings === null) {
    return (
      <section id="kurumsal" className="bg-background py-8">
        <Skeleton className="h-[260px]" />
      </section>
    );
  }

  return (
    <section id="kurumsal" className="bg-background py-8 scroll-mt-[112px]">
      <Reveal>
        <div className="mx-auto mb-5 max-w-[720px] text-center">
          <h2 className="text-primary-dark text-3xl font-bold">
            {settings.corporate_title || "Kurumsal"}
          </h2>
          <p className="text-muted-foreground mt-1.5">{settings.corporate_description}</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {contactItems.map((item, i) => {
          const value = settings[item.key] ?? "";
          return (
            <Reveal key={item.key} delay={i * 70} className="h-full">
              <div className="border-border bg-card h-full rounded-[14px] border p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)]">
                <div className="bg-secondary text-primary-dark mx-auto mb-1.5 flex size-12 items-center justify-center rounded-full">
                  {item.icon}
                </div>
                <p className="text-muted-foreground text-sm font-semibold">{item.label}</p>
                <p className="mt-0.5 font-bold break-words">{value || "—"}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
