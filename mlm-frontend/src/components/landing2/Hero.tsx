"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listHeroSlides, fileUrl } from "@/services/api";
import type { HeroSlide } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Hero (anasayfa) — premium e-ticaret slider.
// Sol tarafta slayt başlığı + CTA'lar, arka planda tam kaplayan kampanya görseli.
// Slayt yoksa bölüm hiç render edilmez; yüklenirken Skeleton gösterilir.
export default function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    listHeroSlides()
      .then((s) => {
        if (active) setSlides(s);
      })
      .catch((err: unknown) => {
        console.error("Hero slider yüklenemedi:", err);
        if (active) setSlides([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const paused = hovered || focused;

  // 5 sn'de bir otomatik geçiş; hover/focus'ta ve hareket azaltma tercihinde durur.
  useEffect(() => {
    if (paused || reduceMotion || !slides || slides.length <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setActiveIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, reduceMotion, slides]);

  const goPrev = () => {
    if (!slides) return;
    setDirection(-1);
    setActiveIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    if (!slides) return;
    setDirection(1);
    setActiveIndex((i) => (i + 1) % slides.length);
  };

  // Yükleniyor: hero ile aynı yükseklikte skeleton.
  if (slides === null) {
    return (
      <section aria-label="Kampanyalar yükleniyor" className="bg-background">
        <div className="pt-[112px] pb-8 md:pt-[128px] md:pb-10">
          <Skeleton className="h-[360px] w-full rounded-3xl md:h-[520px]" />
        </div>
      </section>
    );
  }

  // DB'de aktif slayt yoksa bölüm hiç görünmez.
  if (slides.length === 0) {
    return null;
  }

  const duration = reduceMotion ? 0 : 450;

  return (
    <section aria-label="Öne çıkan kampanyalar" className="bg-background">
      <div className="pt-[112px] pb-8 md:pt-[128px] md:pb-10">
        <div
          role="region"
          aria-roledescription="karusel"
          aria-label="Öne çıkan kampanyalar"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
          className="bg-secondary-dark relative h-[360px] w-full overflow-hidden rounded-3xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.08)] md:h-[520px]"
        >
          {slides.map((s, i) => {
            const isActive = i === activeIndex;
            const image = fileUrl(s.image_path);
            // Slaytta link tanımlıysa CTA'lar o linke gider; yoksa varsayılan rotalar.
            const primaryHref = s.link ?? "/shop";
            const secondaryHref = s.link ?? "/register";

            return (
              <div
                key={s.id}
                aria-hidden={!isActive}
                // inert: pasif slaytlar klavyeyle odaklanamaz / etkileşim alamaz.
                inert={!isActive}
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "scale(1)"
                    : direction > 0
                      ? "scale(1.04) translateX(28px)"
                      : "scale(1.04) translateX(-28px)",
                  transition: `opacity ${duration}ms cubic-bezier(0.2,0,0,1), transform ${duration}ms cubic-bezier(0.2,0,0,1)`,
                }}
                className={cn(
                  "absolute inset-0",
                  isActive ? "pointer-events-auto" : "pointer-events-none"
                )}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={s.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="block h-full w-full object-cover object-center"
                    style={{
                      // Görselden maksimum netlik + hafif canlılık
                      filter: "saturate(1.1) contrast(1.03)",
                    }}
                  />
                ) : (
                  // Görsel yoksa marka tonlarında gradyan zemin
                  <div className="h-full w-full bg-gradient-to-br from-primary-dark via-primary to-secondary-dark" />
                )}

                {/* Okunabilirlik: soldan koyulaşan gradyan + altta yumuşak kapanış */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.16) 74%, rgba(0,0,0,0.04) 100%)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-28"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                />

                {/* Sol içerik: başlık + alt başlık + CTA'lar */}
                <div className="absolute inset-y-0 left-0 z-10 flex w-full max-w-2xl flex-col items-start justify-center px-6 sm:px-10 md:px-14 lg:px-20">
                  <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] sm:text-4xl md:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
                    {s.title}
                  </h2>
                  {s.subtitle ? (
                    <p className="mt-3 max-w-xl text-sm font-medium text-white/90 sm:text-base md:mt-4 md:text-lg">
                      {s.subtitle}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-primary-dark shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] hover:bg-white/90 focus-visible:ring-white/80 focus-visible:ring-offset-0"
                    >
                      <Link href={primaryHref}>Alışverişe Başla</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0"
                    >
                      <Link href={secondaryHref}>Üye Ol</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              {/* Önceki / Sonraki ok butonları */}
              <button
                type="button"
                aria-label="Önceki slayt"
                onClick={goPrev}
                className="absolute top-1/2 left-4 z-20 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/25 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none md:left-6"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Sonraki slayt"
                onClick={goNext}
                className="absolute top-1/2 right-4 z-20 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/25 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none md:right-6"
              >
                <ChevronRight className="size-6" />
              </button>

              {/* Nokta göstergeleri — aktif olan geniş beyaz çubuk */}
              <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
                {slides.map((s, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={`Slayt ${i + 1} göster`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => {
                        setDirection(i > activeIndex ? 1 : -1);
                        setActiveIndex(i);
                      }}
                      className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-none bg-transparent p-1.5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          isActive
                            ? "w-7 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)]"
                            : "w-2 bg-white/50 hover:bg-white/75"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
