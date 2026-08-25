"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { alpha } from "@mui/material/styles";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import AuthCTA from "./AuthCTA";
import { cartCount } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/contexts/ThemeContext";

const navLinks = [
  { href: "/", label: "Anasayfa", icon: <HomeRoundedIcon /> },
  { href: "/shop", label: "Ürünler", icon: <ShoppingBagRoundedIcon /> },
  { href: "/#kurumsal", label: "Kurumsal", icon: <BusinessRoundedIcon /> },
  { href: "/#iletisim", label: "İletişim", icon: <MailRoundedIcon /> },
];

function Logo() {
  return (
    <Link
      href="/"
      aria-label="BestWork ana sayfa"
      style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", lineHeight: 1 }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15, mt: 0.75 }}>
        <Typography component="span" sx={{ fontWeight: 800, color: "primary.main", fontSize: 31, display: "inline-flex", alignItems: "flex-start" }}>
          BestWork
          <Box component="span" aria-label="Registered" sx={{ fontSize: 19, lineHeight: 1, mt: -0.15, color: "primary.main", fontWeight: 700 }}>
            <sup>®</sup>
          </Box>
        </Typography>

      </Box>
    </Link>
  );
}

// Ortak yüzen üst menü (M3 pill). Anasayfa ve shop dahil tüm public sayfalarda kullanılır.
// Sepet ikonu shop sayfasında sağ paneli açar, diğer sayfalarda /shop'a gider.
export default function SiteNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [now, setNow] = useState<Date>(() => new Date());
  const router = useRouter();
  const { mode, toggleMode } = useThemeContext();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const refresh = () => setCount(cartCount());
    refresh();
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleCart = () => {
    window.dispatchEvent(new CustomEvent("open-cart"));
  };

  const submitSearch = () => {
    const q = searchQ.trim();
    setSearchQ("");
    router.push(`/shop${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <>
      <Box
        component="nav"
        aria-label="Ana menü"
        sx={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "90%",
          height: 95,
          bgcolor: "background.paper",
          boxShadow: "none",
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          px: 2.5,
        }}
      >
        <Logo />

        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5, mx: "auto" }}>
          {navLinks.map((l) => {
            const active = l.href === pathname;
            return (
              <Button
                key={l.href}
                component={Link}
                href={l.href}
                startIcon={l.icon}
                sx={{
                  color: active ? "primary.main" : "text.primary",
                  fontWeight: active ? 700 : 500,
                  fontSize: 17,
                  bgcolor: active
                    ? (theme) => alpha(theme.palette.secondary.main, 0.5)
                    : "transparent",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
                }}
              >
                {l.label}
              </Button>
            );
          })}
        </Box>

        <TextField
          size="small"
          placeholder={`${now.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })} · ${now.toLocaleTimeString("tr-TR")}`}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
          sx={{ ml: { xs: 0, md: 2 }, width: { xs: "100%", sm: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: { xs: "auto", md: 0 } }}>
          <IconButton
            aria-label={mode === "dark" ? "Aydınlık moda geç" : "Karanlık moda geç"}
            size="large"
            onClick={toggleMode}
            sx={{
              color: "text.secondary",
              borderRadius: "16px",
              "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
            }}
          >
            {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
          <IconButton
            aria-label={`Sepet (${count} ürün)`}
            size="large"
            onClick={handleCart}
            sx={{
              color: "primary.main",
              borderRadius: "16px",
              "&:hover": { bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.4) },
            }}
          >
            <Badge badgeContent={count} color="primary" max={99}>
              <ShoppingCartRoundedIcon />
            </Badge>
          </IconButton>

          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
            <AuthCTA variant="nav" />
            {user && (
              <IconButton
                aria-label="Çıkış yap"
                size="large"
                onClick={logout}
                sx={{
                  color: "error.main",
                  "&:hover": { bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) },
                }}
              >
                <PowerSettingsNewRoundedIcon />
              </IconButton>
            )}
          </Box>

          <IconButton
            aria-label={drawerOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={drawerOpen}
            aria-controls="site-menu-drawer"
            onClick={() => setDrawerOpen(true)}
            size="large"
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>
      </Box>

      <Drawer
        id="site-menu-drawer"
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "min(84%, 320px)",
              borderTopLeftRadius: "28px",
              borderBottomLeftRadius: "28px",
              p: 2.5,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Logo />
            <IconButton
              aria-label={`Sepet (${count} ürün)`}
              onClick={handleCart}
              sx={{ color: "primary.main" }}
            >
              <Badge badgeContent={count} color="primary" max={99}>
                <ShoppingCartRoundedIcon />
              </Badge>
            </IconButton>
          </Box>

          <List sx={{ mt: 2 }}>
            {navLinks.map((l) => (
              <ListItemButton
                key={l.href}
                component={Link}
                href={l.href}
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: "16px" }}
              >
                <ListItemIcon sx={{ color: "text.primary", minWidth: 40 }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
            <AuthCTA variant="nav" fullWidth />
            {user && (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<PowerSettingsNewRoundedIcon />}
                onClick={logout}
              >
                Çıkış Yap
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
