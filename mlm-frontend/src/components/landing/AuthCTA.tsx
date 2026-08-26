"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useAuth } from "@/hooks/useAuth";
import { ELEVATION, MOTION } from "./tokens";

interface AuthCTAProps {
  variant?: "nav" | "hero" | "cta" | "shop";
  fullWidth?: boolean;
}

// Auth buton grubu — oturum durumuna göre CTA gösterir.
// variant: "nav" (yüzen üst menü), "hero" (hero CTA satırı), "cta" (sayfa sonu banner).
// fullWidth: drawer içinde kullanılırken butonları tam genişlik yapar.
export default function AuthCTA({ variant = "hero", fullWidth = false }: AuthCTAProps) {
  const { user } = useAuth();

  const openLogin = () => {
    window.dispatchEvent(new CustomEvent("open-login"));
  };

  if (variant === "nav") {
    if (user) {
      return (
        <Button
          component={Link}
          href="/dashboard"
          startIcon={<AccountCircleRoundedIcon sx={{ fontSize: 28 }} />}
          fullWidth={fullWidth}
          sx={{
            color: "primary.main",
            bgcolor: "transparent",
            whiteSpace: "nowrap",
            fontWeight: 700,
            "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
          }}
        >
          {user.name.toLocaleUpperCase("tr-TR")}
        </Button>
      );
    }
    return fullWidth ? (
      <>
        <Button component={Link} href="/register" variant="contained" fullWidth>
          Kayıt Ol
        </Button>
        <Button onClick={openLogin} variant="text" fullWidth sx={{ color: "primary.main" }}>
          Giriş
        </Button>
      </>
    ) : (
      <>
        <Button onClick={openLogin} variant="text" sx={{ color: "primary.main" }}>
          Giriş
        </Button>
        <Button component={Link} href="/register" variant="contained" sx={{ boxShadow: ELEVATION.l1 }}>
          Kayıt Ol
        </Button>
      </>
    );
  }

  if (variant === "cta") {
    if (user) {
      return (
        <Button
          component={Link}
          href="/dashboard"
          variant="contained"
          size="large"
          sx={{
            boxShadow: ELEVATION.l1,
            transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
            "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
          }}
        >
          Paneline Git
        </Button>
      );
    }
    return (
      <>
        <Button
          component={Link}
          href="/register"
          variant="contained"
          size="large"
          sx={{
            boxShadow: ELEVATION.l1,
            transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
            "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
          }}
        >
          Kayıt Ol
        </Button>
        <Button
          onClick={openLogin}
          variant="outlined"
          size="large"
          sx={{
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": {
              borderColor: "primary.dark",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
            },
          }}
        >
          Giriş
        </Button>
      </>
    );
  }

  if (variant === "shop") {
    if (user) {
      return (
        <>
          <Button
            component={Link}
            href="/shop"
            variant="contained"
            size="large"
            sx={{
              boxShadow: ELEVATION.l1,
              transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
              "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
            }}
          >
            Alışverişe Devam Et
          </Button>
          <Button
            component={Link}
            href="/dashboard"
            variant="outlined"
            size="large"
            sx={{
              borderColor: "primary.main",
              color: "primary.main",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                borderColor: "primary.dark",
              },
            }}
          >
            Paneline Git
          </Button>
        </>
      );
    }
    return (
      <>
        <Button
          component={Link}
          href="/shop"
          variant="contained"
          size="large"
          sx={{
            boxShadow: ELEVATION.l1,
            transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
            "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
          }}
        >
          Alışverişe Başla
        </Button>
        <Button
          component={Link}
          href="/register"
          variant="outlined"
          size="large"
          sx={{
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
              borderColor: "primary.dark",
            },
          }}
        >
          Kayıt Ol
        </Button>
      </>
    );
  }

  // variant === "hero"
  if (user) {
    return (
      <>
        <Button
          component={Link}
          href="/dashboard"
          variant="contained"
          size="large"
          sx={{
            boxShadow: ELEVATION.l1,
            transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
            "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
          }}
        >
          Paneline Git
        </Button>
        <Button
          component={Link}
          href="/shop"
          variant="outlined"
          size="large"
          sx={{
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
              borderColor: "primary.dark",
            },
          }}
        >
          Alışverişe Başla
        </Button>
      </>
    );
  }
  return (
    <>
      <Button
        component={Link}
        href="/register"
        variant="contained"
        size="large"
        sx={{
          boxShadow: ELEVATION.l1,
          transition: `box-shadow 200ms ${MOTION.standard}, transform 200ms ${MOTION.standard}`,
          "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-2px)" },
        }}
      >
        Kayıt Ol
      </Button>
      <Button
        onClick={openLogin}
        variant="outlined"
        size="large"
        sx={{
          borderColor: "primary.main",
          color: "primary.main",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
            borderColor: "primary.dark",
          },
        }}
      >
        Giriş
      </Button>
    </>
  );
}
