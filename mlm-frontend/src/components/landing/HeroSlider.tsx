"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import { listProducts } from "@/services/api";
import type { Product } from "@/services/api";
import { PASTELS, ELEVATION, MOTION } from "./tokens";

const formatPrice = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <CoffeeRoundedIcon sx={{ fontSize: 44 }} />;
  if (n.includes("enerji") || n.includes("energy")) return <BoltRoundedIcon sx={{ fontSize: 44 }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <LocalDrinkRoundedIcon sx={{ fontSize: 44 }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <SpaRoundedIcon sx={{ fontSize: 44 }} />;
  return <ShoppingBagRoundedIcon sx={{ fontSize: 44 }} />;
}

// Yeşil pastel dünyasından türetilen 3 döngülü gradyan.
const mediaGradient = (theme: Theme, index: number) => {
  const gradients = [
    `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
    `linear-gradient(135deg, ${PASTELS.mint}, ${theme.palette.secondary.light})`,
    `linear-gradient(135deg, ${PASTELS.peach}, ${PASTELS.sage})`,
  ];
  return gradients[index % 3];
};

interface Slide {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  price?: string;
  pvCv?: string;
  ctaLabel: string;
}

// Backend yok / ürün boş ise slider asla boş görünmez — 3 statik fallback slide.
const fallbackSlides: Slide[] = [
  {
    key: "fallback-pv-cv",
    icon: <ShoppingBagRoundedIcon sx={{ fontSize: 44 }} />,
    title: "PV/CV Puanlı Ürünler",
    description: "Her siparişin puan getirir, seviye atlatır.",
    ctaLabel: "Keşfet",
  },
  {
    key: "fallback-binary",
    icon: <AccountTreeRoundedIcon sx={{ fontSize: 44 }} />,
    title: "Binary Komisyon Sistemi",
    description: "Sol-sağ hat eşleşmesiyle her ay prim kazan.",
    ctaLabel: "Keşfet",
  },
  {
    key: "fallback-referral",
    icon: <GroupsRoundedIcon sx={{ fontSize: 44 }} />,
    title: "Referans Bonusu",
    description: "Sponsor ettiğin her üyeden anında kazanç.",
    ctaLabel: "Keşfet",
  },
];

const productToSlide = (p: Product): Slide => ({
  key: `product-${p.id}`,
  icon: productIcon(p.name),
  title: p.name,
  description: p.description || "—",
  price: formatPrice(p.price),
  pvCv: `+${p.pv} PV · +${p.cv} CV`,
  ctaLabel: "İncele",
});

// Hero slider — tek slayt gösterim, efektli geçiş, auto-play, a11y.
export default function HeroSlider() {
  const router = useRouter();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    listProducts()
      .then((ps) => {
        if (!active) return;
        const withStock = ps.filter((p) => p.stock > 0).slice(0, 5);
        setSlides(withStock.length > 0 ? withStock.map(productToSlide) : fallbackSlides);
      })
      .catch((err: unknown) => {
        console.error("Slider ürünleri yüklenemedi:", err);
        if (active) setSlides(fallbackSlides);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const slideCount = slides.length;
  const paused = hovered || focused;

  useEffect(() => {
    if (paused || reduceMotion || slideCount <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setActiveIndex((i) => (i + 1) % slideCount);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, reduceMotion, slideCount, activeIndex]);

  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((i) => (i - 1 + slideCount) % slideCount);
  };
  const goNext = () => {
    setDirection(1);
    setActiveIndex((i) => (i + 1) % slideCount);
  };

  if (loading) {
    return <Skeleton variant="rounded" sx={{ height: { xs: 340, md: 400 }, borderRadius: "20px" }} />;
  }

  const duration = reduceMotion ? 0 : 450;

  return (
    <Box
      role="region"
      aria-roledescription="karusel"
      aria-label="Öne çıkan ürünler"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      sx={{
        position: "relative",
        height: { xs: 340, md: 400 },
        overflow: "hidden",
        borderRadius: "20px",
      }}
    >
      {slides.map((s, i) => {
        const isActive = i === activeIndex;
        return (
          <Box
            key={s.key}
            aria-hidden={!isActive}
            sx={{
              position: "absolute",
              inset: 0,
              p: 4,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
              background: (theme) => mediaGradient(theme, i),
              boxShadow: ELEVATION.l2,
              opacity: isActive ? 1 : 0,
              transform: isActive
                ? "translateX(0)"
                : direction > 0
                  ? "translateX(40px)"
                  : "translateX(-40px)",
              transition: `opacity ${duration}ms ${MOTION.emphasized}, transform ${duration}ms ${MOTION.emphasized}`,
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                maxWidth: "82%",
              }}
            >
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.35)",
                  color: "primary.dark",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.dark" }}>
                {s.title}
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary" }}>
                {s.description}
              </Typography>
              {s.price ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.dark" }}>
                    {s.price}
                  </Typography>
                  {s.pvCv ? (
                    <Chip
                      size="small"
                      label={s.pvCv}
                      sx={{
                        bgcolor: (theme) => alpha(theme.palette.common.white, 0.5),
                        color: "primary.dark",
                        fontWeight: 600,
                      }}
                    />
                  ) : null}
                </Box>
              ) : null}
              <Button
                variant="contained"
                tabIndex={isActive ? 0 : -1}
                onClick={() => router.push("/shop")}
                sx={{ mt: 0.5 }}
              >
                {s.ctaLabel}
              </Button>
            </Box>
          </Box>
        );
      })}

      <IconButton
        aria-label="Önceki ürün"
        onClick={goPrev}
        size="large"
        sx={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "rgba(255,255,255,0.85)",
          color: "primary.dark",
          boxShadow: ELEVATION.l1,
          zIndex: 2,
          "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
        }}
      >
        <ChevronLeftRoundedIcon />
      </IconButton>
      <IconButton
        aria-label="Sonraki ürün"
        onClick={goNext}
        size="large"
        sx={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "rgba(255,255,255,0.85)",
          color: "primary.dark",
          boxShadow: ELEVATION.l1,
          zIndex: 2,
          "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
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
              key={s.key}
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
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: isActive ? 24 : 8,
                  height: 8,
                  borderRadius: 2.8,
                  bgcolor: isActive
                    ? "primary.main"
                    : (theme) => alpha(theme.palette.primary.main, 0.3),
                  transition: "all 250ms ease",
                }}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
