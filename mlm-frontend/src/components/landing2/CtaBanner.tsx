import Link from "next/link";
import { Button } from "@/components/ui/button";

// Büyük dönüşüm bandı — marka yeşili zemin karanlık modda da aynı kalır.
// 135° ışık→gölge geçişi üstteki katmanla sağlanır (token güvenli, tema bağımsız).
export default function CtaBanner() {
  return (
    <section className="bg-background py-10">
      <div className="bg-primary relative overflow-hidden rounded-[10px] px-6 py-10 text-center md:py-14">
        {/* 135° yönlü yeşil→koyu yeşil geçişi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(0,0,0,0.22))]"
        />

        {/* Dekoratif yarı saydam daireler */}
        <div aria-hidden className="bg-white/10 absolute -top-20 -left-20 size-64 rounded-full blur-2xl" />
        <div aria-hidden className="bg-white/10 absolute -right-24 -bottom-24 size-80 rounded-full blur-2xl" />
        <div aria-hidden className="border-white/15 absolute top-8 right-10 hidden size-24 rounded-full border md:block" />

        <div className="relative mx-auto max-w-[680px]">
          <h2 className="text-white text-3xl font-bold md:text-4xl">
            Hemen BestWork Ailesine Katılın
          </h2>
          <p className="text-white/85 mx-auto mt-3 max-w-[520px] text-sm leading-relaxed md:text-base">
            Ücretsiz üye olun, alışveriş yapın, ağınızı kurun ve kazanmaya başlayın.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-primary hover:bg-white/90"
            >
              <Link href="/register">Ücretsiz Üye Ol</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/60 bg-white/10 px-8 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/shop">Alışverişe Başla</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
