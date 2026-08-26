"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
}

// IntersectionObserver tabanlı giriş animasyonu sarmalayıcısı.
// SSR / JS-off güvenli: mount olmadan animasyonsuz görünür.
// prefers-reduced-motion: reduce ise geçiş süresi 0, kayma 0 (anında görünür).
export function Reveal({ children, delay = 0, y = 24, duration = 400, className }: RevealProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();

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
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${effectiveY}px)`,
        transition: `opacity ${effectiveDuration}ms cubic-bezier(0.05,0.7,0.1,1) ${effectiveDelay}ms, transform ${effectiveDuration}ms cubic-bezier(0.05,0.7,0.1,1) ${effectiveDelay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
