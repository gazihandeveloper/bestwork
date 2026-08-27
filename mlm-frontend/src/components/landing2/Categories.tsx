import Link from "next/link";
import { CupSoda, Zap, Flower2, CookingPot, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CategoryItem {
  name: string;
  icon: LucideIcon;
}

const categories: CategoryItem[] = [
  { name: "İçecek", icon: CupSoda },
  { name: "Enerji & Sağlık", icon: Zap },
  { name: "Bakım & Güzellik", icon: Flower2 },
  { name: "Ev & Mutfak", icon: CookingPot },
  { name: "Diğer", icon: LayoutGrid },
];

// Kategoriler — ikonlu premium kartlar (statik sunucu bileşeni, SSR güvenli).
export default function Categories() {
  return (
    <section id="kategoriler" className="bg-background py-10 scroll-mt-[112px]">
      <div className="mx-auto mb-8 max-w-[720px] text-center">
        <h2 className="text-primary-dark mt-2 text-3xl font-bold md:text-4xl">
          Kategoriler
        </h2>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          İhtiyacınız olan her şey tek platformda
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {categories.map(({ name, icon: Icon }) => (
          <Link
            key={name}
            href="/shop"
            className="group border-border bg-card flex flex-col items-center justify-center gap-3 rounded border px-3 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(0,0,0,0.18),0_4px_8px_3px_rgba(0,0,0,0.10)] md:py-8"
          >
            <span className="bg-secondary text-primary-dark group-hover:bg-primary group-hover:text-primary-foreground flex size-12 items-center justify-center rounded-full transition-colors duration-300 md:size-14">
              <Icon className="size-5 md:size-6" />
            </span>
            <span className="text-sm leading-snug font-bold md:text-[0.95rem]">{name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
