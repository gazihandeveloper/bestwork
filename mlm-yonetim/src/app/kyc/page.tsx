"use client";

import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert } from "@/components/StatBox";

export default function ModulSayfasi() {
  return (
    <PanelLayout>
      <PageHeader
        title="kyc"
        subtitle="Bu modül hazırlanıyor."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "kyc" }]}
      />
      <PageCard title="kyc Modülü">
        <InfoAlert>
          Bu modülün yönetim arayüzü şu anda hazırlanıyor. Kısa süre içinde eklenecek.
        </InfoAlert>
        <p className="text-muted mt-2 mb-0">
          Yer tutucu sayfa — ilgili veriler ve işlemler burada gösterilecek.
        </p>
      </PageCard>
    </PanelLayout>
  );
}
