import { ShieldCheck, Truck, Headphones, Award, type LucideIcon } from "lucide-react";

interface TrustItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

// Hero'nun hemen altında güven şeridi — sade, kart görünümü olmayan 4 garanti.
const trustItems: TrustItem[] = [
  { icon: ShieldCheck, title: "Güvenli Ödeme", description: "256-bit SSL korumalı" },
  { icon: Truck, title: "Hızlı Kargo", description: "Türkiye'nin her yerine" },
  { icon: Headphones, title: "7/24 Destek", description: "Her zaman yanınızdayız" },
  { icon: Award, title: "Orijinal Ürün", description: "%100 garantili" },
];

// Statik içerik — sunucu bileşeni olarak çalışır ("use client" gerekmez).
export default function TrustBar() {
  return (
    <section
      aria-label="Güven ve hizmet garantileri"
      className="border-y border-border/60 bg-background py-8 md:py-10"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/60">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2.5 text-center md:flex-row md:items-center md:gap-4 md:px-6 md:text-left"
          >
            <Icon
              aria-hidden
              className="size-7 shrink-0 text-primary"
              strokeWidth={1.75}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold text-foreground">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
