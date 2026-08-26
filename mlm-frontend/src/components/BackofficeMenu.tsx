"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import InventoryRoundedIcon from "@mui/icons-material/InventoryRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
    icon: <PersonRoundedIcon />,
    items: [
      { path: "/profile", label: "Üyelik Bilgilerim", icon: <PersonRoundedIcon /> },
      { path: "/beneficiary", label: "Varis Bilgileri", icon: <FamilyRestroomRoundedIcon /> },
      { path: "/bank", label: "Banka Bilgilerim", icon: <AccountBalanceRoundedIcon /> },
      { path: "/sponsored", label: "Sponsor Olduklarım", icon: <GroupsRoundedIcon /> },
      { path: "/change-password", label: "Şifre Değiştir", icon: <LockRoundedIcon /> },
    ],
  },
  {
    title: "Prim",
    icon: <ReceiptLongRoundedIcon />,
    items: [
      { path: "/commissions", label: "Prim Detayları", icon: <ReceiptLongRoundedIcon /> },
      { path: "/commissions?type=referral", label: "Referans Bonusu", icon: <GroupsRoundedIcon /> },
      { path: "/leadership-bonus", label: "Liderlik Primi", icon: <MilitaryTechRoundedIcon /> },
      { path: "/binary-transactions", label: "Binary Hareketleri", icon: <AccountTreeRoundedIcon /> },
      { path: "/career", label: "Kariyer Takibi", icon: <MilitaryTechRoundedIcon /> },
      { path: "/tree", label: "Binary Ağacı", icon: <AccountTreeRoundedIcon /> },
      { path: "/sponsor-tree", label: "Referans ve Ekip Ağacı", icon: <GroupsRoundedIcon /> },
      { path: "/pending", label: "Yerleşim Bekleyenler", icon: <GroupRoundedIcon /> },
    ],
  },
  {
    title: "İşlemlerim",
    icon: <ShoppingCartRoundedIcon />,
    items: [
      { path: "/shop", label: "Alışveriş", icon: <ShoppingCartRoundedIcon /> },
      { path: "/orders", label: "Siparişlerim", icon: <InventoryRoundedIcon /> },
      { path: "/payment-notifications", label: "EFT/HAVALE Bildirimleri", icon: <AccountBalanceRoundedIcon /> },
      { path: "/retail-earnings", label: "Müşteri Kazancı", icon: <ReceiptLongRoundedIcon /> },
      { path: "/opportunities", label: "İş Fırsatları", icon: <MilitaryTechRoundedIcon /> },
    ],
  },
  {
    title: "İletişim",
    icon: <MailRoundedIcon />,
    items: [{ path: "/contact", label: "Destek / İletişim", icon: <MailRoundedIcon /> }],
  },
  {
    title: "Admin",
    icon: <AdminPanelSettingsRoundedIcon />,
    adminOnly: true,
    items: [
      { path: "/admin/dashboard", label: "Admin Panel", icon: <AdminPanelSettingsRoundedIcon /> },
      { path: "/admin/pending", label: "Bekleyenler Yönetimi", icon: <GroupRoundedIcon /> },
      { path: "/admin/products", label: "Ürün Yönetimi", icon: <InventoryRoundedIcon /> },
      { path: "/admin/hero-slides", label: "Hero Slider", icon: <ImageRoundedIcon /> },
      { path: "/admin/benefits", label: "Avantaj Kartları", icon: <RedeemRoundedIcon /> },
      { path: "/admin/corporate", label: "Kurumsal İçerik", icon: <BusinessRoundedIcon /> },
      { path: "/admin/withdrawals", label: "Çekim Talepleri", icon: <ReceiptLongRoundedIcon /> },
      { path: "/admin/payment-notifications", label: "Ödeme Bildirimleri", icon: <AccountBalanceRoundedIcon /> },
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
        startIcon={<HomeRoundedIcon />}
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
              endIcon={<ExpandMoreRoundedIcon />}
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
