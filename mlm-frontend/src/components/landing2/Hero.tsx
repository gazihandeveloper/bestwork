"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { listHeroSlides, fileUrl } from "@/services/api";
import type { HeroSlide } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5000;

// Hero (anasayfa) — premium e-ticaret slider.
// Sol tarafta rozet + başlık + CTA'lar, arka planda tam kaplayan kampanya görseli.
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
    }, AUTOPLAY_MS);
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
          <Skeleton className="h-[400px] w-full rounded-sm sm:h-[480px] md:h-[580px]" />
        </div>
      </section>
    );
  }

  // DB'de aktif slayt yoksa bölüm hiç görünmez.
  if (slides.length === 0) {
    return null;
  }

  const duration = reduceMotion ? 0 : 500;
  const slideCount = slides.length;

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
          className="group relative h-[400px] w-full overflow-hidden rounded-sm bg-secondary-dark shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5),0_2px_10px_rgba(0,0,0,0.08)] sm:h-[480px] md:h-[580px]"
        >
          {/* Slaytlar */}
          {slides.map((s, i) => {
            const isActive = i === activeIndex;
            const image = fileUrl(s.image_path);
            const primaryHref = s.link ?? "/shop";
            const secondaryHref = s.link ?? "/register";

            return (
              <div
                key={s.id}
                aria-hidden={!isActive}
                inert={!isActive}
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "scale(1)"
                    : direction > 0
                      ? "scale(1.05) translateX(36px)"
                      : "scale(1.05) translateX(-36px)",
                  transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1), transform ${duration}ms cubic-bezier(0.22,1,0.36,1)`,
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
                      filter: "saturate(1.12) contrast(1.05)",
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary-dark via-primary to-secondary-dark" />
                )}

                {/* Okunabilirlik: soldan koyulaşan gradyan + altta yumuşak kapanış */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(100deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.05) 100%)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-36"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
                  }}
                />

                {/* Sol içerik: rozet + başlık + alt yazı + CTA'lar */}
                <div className="absolute inset-y-0 left-0 z-10 flex w-full max-w-2xl flex-col items-start justify-center px-6 sm:px-10 md:px-14 lg:px-20">
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-white uppercase backdrop-blur-md sm:text-xs">
                    <Sparkles className="size-3.5" />
                    BestWork Fırsatları
                  </span>
                  <h2 className="text-[2rem] leading-[1.1] font-black tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)] sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                    {s.title}
                  </h2>
                  {s.subtitle ? (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed font-medium text-white/90 sm:text-base md:mt-4 md:text-lg">
                      {s.subtitle}
                    </p>
                  ) : null}
                  <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="bg-white px-7 text-primary-dark shadow-[0_14px_36px_-12px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90 focus-visible:ring-white/80 focus-visible:ring-offset-0"
                    >
                      <Link href={primaryHref}>Alışverişe Başla</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-white/10 px-7 text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/20 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0"
                    >
                      <Link href={secondaryHref}>Üye Ol</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Kontroller — hover'da belirginleşir */}
          {slideCount > 1 && (
            <>
              <button
                type="button"
                aria-label="Önceki slayt"
                onClick={goPrev}
                className="absolute top-1/2 left-4 z-20 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white opacity-80 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/35 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none md:left-6 md:size-12"
              >
                <ChevronLeft className="size-6 md:size-7" />
              </button>
              <button
                type="button"
                aria-label="Sonraki slayt"
                onClick={goNext}
                className="absolute top-1/2 right-4 z-20 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white opacity-80 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/35 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none md:right-6 md:size-12"
              >
                <ChevronRight className="size-6 md:size-7" />
              </button>

              {/* Alt kontrol çubuğu: noktalar + sayaç */}
              <div className="absolute right-4 bottom-5 left-4 z-20 flex items-center justify-between md:right-6 md:left-6">
                <div className="flex items-center gap-1">
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
                        className="flex min-h-[40px] min-w-[36px] cursor-pointer items-center justify-center border-none bg-transparent p-1.5"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            isActive
                              ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                              : "w-2 bg-white/45 hover:bg-white/70"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>

                <span className="hidden items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold tracking-widest text-white backdrop-blur-md sm:flex">
                  <span className="text-base">0{activeIndex + 1}</span>
                  <span className="text-white/50">/</span>
                  <span className="text-white/70">0{slideCount}</span>
                </span>
              </div>

              {/* Autoplay ilerleme çubuğu */}
              {!reduceMotion && (
                <div
                  aria-hidden
                  className="absolute right-0 bottom-0 left-0 z-20 h-[3px] bg-white/10"
                >
                  <div
                    key={activeIndex}
                    className="bg-white/80 h-full"
                    style={{
                      animation: paused
                        ? "none"
                        : `heroProgress ${AUTOPLAY_MS}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes heroProgress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
