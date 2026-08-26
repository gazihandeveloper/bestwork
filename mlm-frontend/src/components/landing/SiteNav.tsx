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
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { alpha } from "@mui/material/styles";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/contexts/ThemeContext";
import { cartCount } from "@/lib/cart";

const navLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/shop", label: "Ürünler" },
  { href: "/#kurumsal", label: "Kurumsal" },
  { href: "/#iletisim", label: "İletişim" },
];

function Logo() {
  return (
    <Link
      href="/"
      aria-label="BestWork ana sayfa"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        marginLeft: 8,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15, mt: 0.75 }}>
        <Typography
          component="span"
          sx={{
            fontWeight: 900,
            color: "primary.main",
            fontSize: 36,
            display: "inline-flex",
            alignItems: "flex-start",
          }}
        >
          BestWork
          <Box component="span" aria-label="Registered" sx={{ fontSize: 22, lineHeight: 1, mt: 0.3, color: "primary.main", fontWeight: 900 }}>
            <sup>®</sup>
          </Box>
        </Typography>
      </Box>
    </Link>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { mode, toggleMode } = useThemeContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [count, setCount] = useState(0);

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

  const openLogin = () => window.dispatchEvent(new CustomEvent("open-login"));
  const openCart = () => window.dispatchEvent(new CustomEvent("open-cart"));

  const submitSearch = () => {
    const q = searchQ.trim();
    setSearchOpen(false);
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
          left: 0,
          right: 0,
          marginInline: "auto",
          width: "75%",

          height: 95,
          bgcolor: "background.default",
          boxShadow: "none",
          border: "none",
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          px: 2.5,
        }}
      >
        <Logo />

        {/* Menü linkleri */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, ml: 8 }}>
          {navLinks.map((l) => {
            const active = l.href === pathname;
            return (
              <Button
                key={l.href}
                component={Link}
                href={l.href}
                disableRipple
                sx={{
                  color: active ? "primary.main" : "text.primary",
                  fontWeight: active ? 700 : 500,
                  fontSize: 17,
                  bgcolor: active ? (theme) => alpha(theme.palette.secondary.main, 0.5) : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {l.label}
              </Button>
            );
          })}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Arama ikonu → ortada blur popup */}
          <IconButton aria-label="Ara" size="large" disableRipple onClick={() => setSearchOpen(true)} sx={{ color: "primary.main" }}>
            <SearchRoundedIcon />
          </IconButton>

          {/* Gece/gündüz */}
          <IconButton aria-label="Gece/gündüz modu" size="large" disableRipple onClick={toggleMode} sx={{ color: mode === "dark" ? "#FFB300" : "primary.main" }}>
            {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>

          {/* Sepet */}
          <IconButton aria-label={`Sepet (${count} ürün)`} size="large" disableRipple onClick={openCart} sx={{ color: "primary.main" }}>
            <Badge badgeContent={count} color="primary" max={99}>
              <ShoppingCartRoundedIcon />
            </Badge>
          </IconButton>

          {/* Oturum */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
            {loading ? (
              <Box sx={{ width: 90, height: 36, borderRadius: "999px", bgcolor: "secondary.main", opacity: 0.5 }} />
            ) : user ? (
              <>
                <Button component={Link} href="/dashboard" disableRipple sx={{ color: "primary.main", whiteSpace: "nowrap", fontWeight: 800, fontSize: 17 }}>
                  {user.name.toLocaleUpperCase("tr-TR")}
                </Button>
                <IconButton aria-label="Çıkış yap" size="large" disableRipple onClick={logout} sx={{ color: "primary.main" }}>
                  <PowerSettingsNewRoundedIcon sx={{ fontSize: 30 }} />
                </IconButton>
              </>
            ) : (
              <Button onClick={openLogin} disableRipple variant="contained" sx={{ fontWeight: 800, color: "#fff" }}>
                Oturum Aç
              </Button>
            )}
          </Box>

          {/* Mobil menü */}
          <IconButton
            aria-label="Menü"
            size="large"
            disableRipple
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: "inline-flex", md: "none" }, color: "primary.main" }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Arama popup — ortada, blur arka plan */}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backdropFilter: "blur(8px)", bgcolor: "rgba(0,0,0,0.55)" } },
          paper: { sx: { borderRadius: "24px", p: 2, bgcolor: "background.paper" } },
        }}
      >
        <DialogContent sx={{ p: "8px !important" }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Ürün ara..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
              if (e.key === "Escape") setSearchOpen(false);
            }}
            sx={{ "& .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 22 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Mobil çekmece */}
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
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Logo />
            <IconButton aria-label="Kapat" size="large" disableRipple onClick={() => setDrawerOpen(false)}>
              <MenuRoundedIcon />
            </IconButton>
          </Box>

          <List sx={{ mt: 1 }}>
            {navLinks.map((l) => (
              <ListItemButton
                key={l.href}
                component={Link}
                href={l.href}
                disableRipple
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: "16px" }}
              >
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
            {loading ? (
              <Box sx={{ height: 44, borderRadius: "28px", bgcolor: "secondary.main", opacity: 0.5 }} />
            ) : user ? (
              <>
                <Button component={Link} href="/dashboard" fullWidth variant="contained" disableRipple onClick={() => setDrawerOpen(false)}>
                  {user.name.toLocaleUpperCase("tr-TR")}
                </Button>
                <Button fullWidth variant="outlined" color="primary" disableRipple startIcon={<PowerSettingsNewRoundedIcon />} onClick={logout}>
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <Button fullWidth variant="contained" disableRipple onClick={() => { setDrawerOpen(false); openLogin(); }}>
                Oturum Aç
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
