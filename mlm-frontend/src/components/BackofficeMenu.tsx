"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import {
  User,
  Landmark,
  Users,
  Lock,
  Receipt,
  Medal,
  Network,
  ShoppingCart,
  Package,
  Image,
  Gift,
  Building2,
  ShieldCheck,
  Home,
  Mail,
  ChevronDown,
} from "lucide-react";
import { alpha } from "@mui/material/styles";
import { useAuth } from "@/hooks/useAuth";
import { ELEVATION } from "@/components/landing/tokens";

interface MenuItemDef {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  title: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  items: MenuItemDef[];
}

const groups: MenuGroup[] = [
  {
    title: "Kişisel",
    icon: <User />,
    items: [
      { path: "/profile", label: "Üyelik Bilgilerim", icon: <User /> },
      { path: "/beneficiary", label: "Varis Bilgileri", icon: <Users /> },
      { path: "/bank", label: "Banka Bilgilerim", icon: <Landmark /> },
      { path: "/sponsored", label: "Sponsor Olduklarım", icon: <Users /> },
      { path: "/change-password", label: "Şifre Değiştir", icon: <Lock /> },
    ],
  },
  {
    title: "Prim",
    icon: <Receipt />,
    items: [
      { path: "/commissions", label: "Prim Detayları", icon: <Receipt /> },
      { path: "/commissions?type=referral", label: "Referans Bonusu", icon: <Users /> },
      { path: "/leadership-bonus", label: "Liderlik Primi", icon: <Medal /> },
      { path: "/binary-transactions", label: "Binary Hareketleri", icon: <Network /> },
      { path: "/career", label: "Kariyer Takibi", icon: <Medal /> },
      { path: "/tree", label: "Binary Ağacı", icon: <Network /> },
      { path: "/sponsor-tree", label: "Referans ve Ekip Ağacı", icon: <Users /> },
      { path: "/pending", label: "Yerleşim Bekleyenler", icon: <Users /> },
    ],
  },
  {
    title: "İşlemlerim",
    icon: <ShoppingCart />,
    items: [
      { path: "/shop", label: "Alışveriş", icon: <ShoppingCart /> },
      { path: "/orders", label: "Siparişlerim", icon: <Package /> },
      { path: "/payment-notifications", label: "EFT/HAVALE Bildirimleri", icon: <Landmark /> },
      { path: "/retail-earnings", label: "Müşteri Kazancı", icon: <Receipt /> },
      { path: "/opportunities", label: "İş Fırsatları", icon: <Medal /> },
    ],
  },
  {
    title: "İletişim",
    icon: <Mail />,
    items: [{ path: "/contact", label: "Destek / İletişim", icon: <Mail /> }],
  },
  {
    title: "Admin",
    icon: <ShieldCheck />,
    adminOnly: true,
    items: [
      { path: "/admin/dashboard", label: "Admin Panel", icon: <ShieldCheck /> },
      { path: "/admin/pending", label: "Bekleyenler Yönetimi", icon: <Users /> },
      { path: "/admin/products", label: "Ürün Yönetimi", icon: <Package /> },
      // eslint-disable-next-line jsx-a11y/alt-text -- lucide dekoratif ikon, <img> değil
      { path: "/admin/hero-slides", label: "Hero Slider", icon: <Image /> },
      { path: "/admin/benefits", label: "Avantaj Kartları", icon: <Gift /> },
      { path: "/admin/corporate", label: "Kurumsal İçerik", icon: <Building2 /> },
      { path: "/admin/withdrawals", label: "Çekim Talepleri", icon: <Receipt /> },
      { path: "/admin/payment-notifications", label: "Ödeme Bildirimleri", icon: <Landmark /> },
    ],
  },
];

// Backoffice yatay menüsü — grup dropdown'ları, aktif öğe yeşil vurgulu.
export default function BackofficeMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const visibleGroups = groups.filter((g) => !g.adminOnly || isAdmin);

  const groupActive = (g: MenuGroup) =>
    g.items.some((item) => {
      const base = item.path.split("?")[0];
      return pathname === base || pathname.startsWith(base + "/");
    });

  const handleOpen = (title: string, e: React.MouseEvent<HTMLElement>) => {
    setOpenGroup(title);
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setOpenGroup(null);
  };

  const handleNav = (path: string) => {
    handleClose();
    router.push(path);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        gap: 1,
        overflowX: "auto",
        p: 1,
        mb: 2,
        borderRadius: "14px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: ELEVATION.l1,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {/* Anasayfa — düz buton, dropdown'suz */}
      <Button
        onClick={() => router.push("/dashboard")}
        startIcon={<Home />}
        sx={{
          flexShrink: 0,
          whiteSpace: "nowrap",
          borderRadius: "7px",
          px: 2,
          bgcolor: pathname === "/dashboard" ? "primary.main" : "transparent",
          color: pathname === "/dashboard" ? "common.white" : "text.primary",
          fontWeight: pathname === "/dashboard" ? 700 : 500,
          "&:hover": {
            bgcolor:
              pathname === "/dashboard"
                ? "primary.dark"
                : (theme) => alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        Anasayfa
      </Button>

      {visibleGroups.map((g) => {
        const active = groupActive(g);
        return (
          <Box key={g.title}>
            <Button
              onClick={(e) => handleOpen(g.title, e)}
              startIcon={g.icon}
              endIcon={<ChevronDown />}
              sx={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                borderRadius: "7px",
                px: 2,
                bgcolor: active ? "primary.main" : "transparent",
                color: active ? "common.white" : "text.primary",
                fontWeight: active ? 700 : 500,
                "&:hover": {
                  bgcolor: active ? "primary.dark" : (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              {g.title}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={openGroup === g.title}
              onClose={handleClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              slotProps={{
                paper: { sx: { borderRadius: "8.4px", minWidth: 240, mt: 0.5 } },
              }}
            >
              {g.items.map((item) => {
                const base = item.path.split("?")[0];
                const selected = pathname === base || pathname.startsWith(base + "/");
                return (
                  <MenuItem
                    key={item.path}
                    selected={selected}
                    onClick={() => handleNav(item.path)}
                    sx={{ borderRadius: "5.6px", mx: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontSize: 14, fontWeight: selected ? 700 : 400 } } }}
                    />
                  </MenuItem>
                );
              })}
            </Menu>
          </Box>
        );
      })}
    </Box>
  );
}
