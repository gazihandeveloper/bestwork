"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listHeroSlides, fileUrl } from "@/services/api";
import type { HeroSlide } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Hero (anasayfa) — büyük, köşeleri yuvarlatılmış görsel slider (metin overlay'siz).
// Görselin tamamına tıklanınca DB'deki link açılır; kayıt yoksa bölüm render edilmez.
export default function Hero() {
  const router = useRouter();
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

  if (slides === null) {
    return (
      <section id="anasayfa" className="bg-background">
        <div className="px-0 pt-[104px] pb-6 md:pt-[112px] md:pb-8">
          <Skeleton className="mx-auto h-[320px] w-full max-w-[1782px] rounded-[20px] md:h-[646px]" />
        </div>
      </section>
    );
  }

  // Slider kaydı yoksa bölüm hiç görünmez.
  if (slides.length === 0) {
    return null;
  }

  const duration = reduceMotion ? 0 : 450;

  return (
    <section id="anasayfa" className="bg-background">
      <div className="px-0 pt-[104px] pb-6 md:pt-[112px] md:pb-8">
        <div
          role="region"
          aria-roledescription="karusel"
          aria-label="Kampanya ve ürün görselleri"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
          className="bg-card relative mx-auto h-[320px] w-full max-w-[1782px] overflow-hidden rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.18),0_2px_4px_2px_rgba(0,0,0,0.08)] sm:h-[480px] md:h-[646px]"
        >
          {slides.map((s, i) => {
            const isActive = i === activeIndex;
            const image = fileUrl(s.image_path);
            return (
              <div
                key={s.id}
                aria-hidden={!isActive}
                role={s.link ? "link" : undefined}
                tabIndex={s.link && isActive ? 0 : -1}
                aria-label={s.link ? s.title : undefined}
                onClick={() => {
                  if (s.link) router.push(s.link);
                }}
                onKeyDown={(e) => {
                  if (s.link && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    router.push(s.link);
                  }
                }}
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "scale(1)"
                    : direction > 0
                      ? "scale(1.03) translateX(30px)"
                      : "scale(1.03) translateX(-30px)",
                  transition: `opacity ${duration}ms cubic-bezier(0.2,0,0,1), transform ${duration}ms cubic-bezier(0.2,0,0,1)`,
                }}
                className={cn(
                  "absolute inset-0 cursor-default",
                  s.link && "cursor-pointer",
                  isActive ? "pointer-events-auto" : "pointer-events-none",
                  "focus-visible:outline-[3px] focus-visible:-outline-offset-3 focus-visible:outline-white"
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
                      // 4K içerikten maksimum netlik + hafif canlılık
                      filter: "saturate(1.12) contrast(1.04)",
                    }}
                  />
                ) : null}

                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,0.28) 100%)",
                  }}
                />
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button
                aria-label="Önceki görsel"
                onClick={goPrev}
                className="bg-white/85 text-primary-dark absolute top-1/2 left-4 z-[2] flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)] transition-colors hover:bg-white"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                aria-label="Sonraki görsel"
                onClick={goNext}
                className="bg-white/85 text-primary-dark absolute top-1/2 right-4 z-[2] flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)] transition-colors hover:bg-white"
              >
                <ChevronRight className="size-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 z-[2] flex -translate-x-1/2 gap-1">
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
                      className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-none bg-transparent p-0.5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 rounded-[2.8px] transition-all duration-250",
                          isActive ? "w-6 bg-white" : "w-2 bg-white/50"
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
