import Link from "next/link";
import { Gift, Workflow, Crown, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EarningPlan {
  title: string;
  description: string;
  icon: LucideIcon;
}

const plans: EarningPlan[] = [
  {
    title: "Referans Bonusu",
    description: "Sponsor ettiğiniz her üyeden anında prim kazanın.",
    icon: Gift,
  },
  {
    title: "Binary Komisyon",
    description: "Sol-sağ hat eşleşmesiyle her ay düzenli komisyon.",
    icon: Workflow,
  },
  {
    title: "Liderlik Primi",
    description: "Ekibinizin kazancından derinlik primleri kazanın.",
    icon: Crown,
  },
];

// Kazanç Sistemleri — statik sunucu bileşeni (animasyonsuz, SSR güvenli).
export default function Earnings() {
  return (
    <section id="kazanc-sistemleri" className="bg-background py-10 scroll-mt-[112px]">
      <div className="mx-auto mb-8 max-w-[720px] text-center">
        <span className="text-primary dark:text-primary-dark text-xs font-bold tracking-[0.22em] uppercase">
          Kazanç Sistemleri
        </span>
        <h2 className="text-primary-dark mt-2 text-3xl font-bold md:text-4xl">
          Kazanç Sistemleri
        </h2>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Üç farklı gelir kapısıyla her seviyede kazanın — ağınız büyüdükçe kazancınız da büyüsün.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {plans.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-t-2 border-t-primary p-6 shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(0,0,0,0.18),0_2px_4px_2px_rgba(0,0,0,0.08)]"
          >
            {/* Dekoratif köşe parıltısı */}
            <div aria-hidden className="bg-primary/5 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full" />

            <div className="bg-primary text-primary-foreground relative flex size-12 items-center justify-center rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)]">
              <Icon className="size-6" />
            </div>

            <h3 className="relative mt-4 text-lg font-bold">{title}</h3>
            <p className="text-muted-foreground relative mt-1.5 flex-1 text-sm leading-relaxed">
              {description}
            </p>

            <Link
              href="/dashboard"
              className="text-primary hover:text-primary-dark relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            >
              Detaylı İncele
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
