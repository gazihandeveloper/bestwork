"use client";

import { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { listHeroSlides, fileUrl } from "@/services/api";
import type { HeroSlide } from "@/services/api";
import { ELEVATION, MOTION } from "./tokens";

// Hero (anasayfa) — büyük, köşeleri yuvarlatılmış görsel slider (metin overlay'siz).
// Görselin tamamına tıklanınca DB'deki link açılır; kayıt yoksa bölüm render edilmez.
export default function Hero() {
  const router = useRouter();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
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
      <Box component="section" id="anasayfa" sx={{ bgcolor: "background.default" }}>
        <Container maxWidth={false} sx={{ pt: { xs: 13, md: 14 }, pb: { xs: 6, md: 8 } }}>
          <Skeleton variant="rounded" sx={{ height: { xs: 320, md: 646 }, borderRadius: "20px", maxWidth: 1782, mx: "auto" }} />
        </Container>
      </Box>
    );
  }

  // Slider kaydı yoksa bölüm hiç görünmez.
  if (slides.length === 0) {
    return null;
  }

  const duration = reduceMotion ? 0 : 450;

  return (
    <Box component="section" id="anasayfa" sx={{ bgcolor: "background.default" }}>
      <Container maxWidth={false} sx={{ pt: { xs: 13, md: 14 }, pb: { xs: 6, md: 8 } }}>
        <Box
          role="region"
          aria-roledescription="karusel"
          aria-label="Kampanya ve ürün görselleri"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 1782,
            mx: "auto",
            height: { xs: 320, sm: 480, md: 646 },
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: ELEVATION.l2,
            bgcolor: "background.paper",
          }}
        >
          {slides.map((s, i) => {
            const isActive = i === activeIndex;
            const image = fileUrl(s.image_path);
            return (
              <Box
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
                sx={{
                  position: "absolute",
                  inset: 0,
                  cursor: s.link ? "pointer" : "default",
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "scale(1)"
                    : direction > 0
                      ? "scale(1.03) translateX(30px)"
                      : "scale(1.03) translateX(-30px)",
                  transition: `opacity ${duration}ms ${MOTION.emphasized}, transform ${duration}ms ${MOTION.emphasized}`,
                  pointerEvents: isActive ? "auto" : "none",
                  "&:focus-visible": { outline: "3px solid #fff", outlineOffset: -3 },
                }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={s.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                      // 4K içerikten maksimum netlik + hafif canlılık
                      filter: "saturate(1.12) contrast(1.04)",
                      imageRendering: "auto",
                    }}
                  />
                ) : null}

                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,0.28) 100%)",
                  }}
                />
              </Box>
            );
          })}

          {slides.length > 1 && (
            <>
              <IconButton
                aria-label="Önceki görsel"
                onClick={goPrev}
                size="large"
                sx={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(255,255,255,0.85)",
                  color: "primary.dark",
                  boxShadow: ELEVATION.l1,
                  zIndex: 2,
                  "&:hover": { bgcolor: "common.white" },
                }}
              >
                <ChevronLeftRoundedIcon />
              </IconButton>
              <IconButton
                aria-label="Sonraki görsel"
                onClick={goNext}
                size="large"
                sx={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(255,255,255,0.85)",
                  color: "primary.dark",
                  boxShadow: ELEVATION.l1,
                  zIndex: 2,
                  "&:hover": { bgcolor: "common.white" },
                }}
              >
                <ChevronRightRoundedIcon />
              </IconButton>

              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 1,
                  zIndex: 2,
                }}
              >
                {slides.map((s, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <Box
                      key={s.id}
                      component="button"
                      type="button"
                      aria-label={`Slayt ${i + 1} göster`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => {
                        setDirection(i > activeIndex ? 1 : -1);
                        setActiveIndex(i);
                      }}
                      sx={{
                        p: 0.5,
                        minWidth: 44,
                        minHeight: 44,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                        bgcolor: "transparent",
                      }}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          width: isActive ? 24 : 8,
                          height: 8,
                          borderRadius: 2.8,
                          bgcolor: isActive ? "common.white" : "rgba(255,255,255,0.5)",
                          transition: "all 250ms ease",
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
}
