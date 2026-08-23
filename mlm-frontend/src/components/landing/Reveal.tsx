"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { MOTION } from "./tokens";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  sx?: SxProps<Theme>;
}

// IntersectionObserver tabanlı giriş animasyonu sarmalayıcısı.
// SSR / JS-off güvenli: mount olmadan animasyonsuz görünür.
// prefers-reduced-motion: reduce ise geçiş süresi 0, kayma 0 (anında görünür).
export default function Reveal({ children, delay = 0, y = 24, duration = MOTION.medium, sx }: RevealProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    // Hydration güvenliği: sunucuda false, istemcide mount sonrası true.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Above-fold öğeler (LCP adayları) ilk frame'de görünür; observer'a gerek kalmaz.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effectiveDuration = reduceMotion ? 0 : duration;
  const effectiveY = reduceMotion ? 0 : y;
  const effectiveDelay = reduceMotion ? 0 : delay;

  // Mount öncesi (SSR) ve reduce-motion durumunda animasyonsuz görünür.
  const shown = !mounted || reduceMotion || visible;

  return (
    <Box
      ref={ref}
      sx={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${effectiveY}px)`,
        transition: `opacity ${effectiveDuration}ms ${MOTION.emphasizedDecelerate} ${effectiveDelay}ms, transform ${effectiveDuration}ms ${MOTION.emphasizedDecelerate} ${effectiveDelay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
