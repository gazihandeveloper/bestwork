"use client";

import { useParams } from "next/navigation";
import { PromotionEditPage } from "@/components/admin/PromotionForm";

// Mevcut kampanya/promosyonu düzenleme sayfası: /promosyonlar/duzenle/[id]
export default function DuzenlePromosyonPage() {
  const params = useParams();
  const raw = (params as { id?: string } | null)?.id;
  const id = Number(raw);
  return <PromotionEditPage id={Number.isFinite(id) && id > 0 ? id : undefined} />;
}
