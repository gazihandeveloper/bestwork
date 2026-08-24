"use client";

import { usePathname, useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";

const tabs = [
  { path: "/dashboard", label: "Panel", icon: <DashboardRoundedIcon /> },
  { path: "/shop", label: "Alışveriş", icon: <ShoppingCartRoundedIcon /> },
  { path: "/tree", label: "Ağaç", icon: <AccountTreeRoundedIcon /> },
  { path: "/pending", label: "Bekleyenler", icon: <GroupRoundedIcon /> },
  { path: "/profile", label: "Profil", icon: <PersonRoundedIcon /> },
];

// MD3 yüzen alt navigasyon (mobil). Masaüstünde gizlenir (üst bar kullanılır).
export default function FloatingNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Paper
      elevation={6}
      sx={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(92%, 460px)",
        borderRadius: 28,
        bgcolor: "#16331B", // her iki modda da koyu bar (primary.dark'a bağımlı değil)
        zIndex: 1100,
        display: { xs: "block", md: "none" },
        overflow: "hidden",
      }}
    >
      <BottomNavigation
        showLabels
        value={pathname}
        onChange={(_, newValue) => router.push(newValue as string)}
        sx={{
          bgcolor: "transparent",
          height: 64,
          "& .MuiBottomNavigationAction-root": { color: "rgba(255,255,255,0.6)", borderRadius: 24 },
          "& .Mui-selected": {
            color: "#A5D6A7",
            "& .MuiBottomNavigationAction-label": { fontSize: 11, fontWeight: 600 },
          },
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction key={tab.path} label={tab.label} value={tab.path} icon={tab.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
