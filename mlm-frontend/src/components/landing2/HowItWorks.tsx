import { UserPlus, ShoppingCart, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Üye Ol",
    description: "Saniyeler içinde ücretsiz üye olun, üye numaranız otomatik oluşur.",
    icon: UserPlus,
  },
  {
    number: "02",
    title: "Alışveriş Yap",
    description: "PV/CV puan kazandıran ürünlerden sipariş verin.",
    icon: ShoppingCart,
  },
  {
    number: "03",
    title: "Ağını Kur & Kazan",
    description: "Ekibini büyüt, binary komisyonlarla her ay kazan.",
    icon: Users,
  },
];

// Nasıl Çalışır? — statik sunucu bileşeni (animasyonsuz, SSR güvenli).
// Adımları md+ ekranlarda ikon hizasında kesikli bir çizgi birbirine bağlar.
export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="bg-background py-10 scroll-mt-[112px]">
      <div className="bg-muted rounded-2xl px-4 py-10 sm:px-8 md:px-12 md:py-14">
        <div className="mx-auto mb-10 max-w-[720px] text-center">
          <span className="text-primary dark:text-primary-dark text-xs font-bold tracking-[0.22em] uppercase">
            3 Basit Adım
          </span>
          <h2 className="text-primary-dark mt-2 text-3xl font-bold md:text-4xl">
            Nasıl Çalışır?
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Üye olun, alışveriş yapın ve ağınızı büyüterek kazanmaya başlayın.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {/* İkon merkezleri (top-8) hizasında 1. ve 3. ikon arasında kesikli bağlantı */}
          <span
            aria-hidden
            className="border-primary/25 absolute top-8 right-[16.6667%] left-[16.6667%] hidden border-t-2 border-dashed md:block"
          />

          {steps.map(({ number, title, description, icon: Icon }) => (
            <div key={number} className="relative flex flex-col items-center text-center">
              <span
                aria-hidden
                className="text-primary/15 absolute -top-3 left-1/2 -translate-x-1/2 text-5xl font-extrabold select-none"
              >
                {number}
              </span>

              <div className="bg-secondary text-primary-dark relative z-10 flex size-16 items-center justify-center rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)]">
                <Icon className="size-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="text-muted-foreground mt-2 max-w-[260px] text-sm leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
