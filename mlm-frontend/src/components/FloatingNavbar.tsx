"use client";

import { usePathname, useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { LayoutDashboard, ShoppingCart, Network, Users, User } from "lucide-react";

const tabs = [
  { path: "/dashboard", label: "Panel", icon: <LayoutDashboard /> },
  { path: "/shop", label: "Alışveriş", icon: <ShoppingCart /> },
  { path: "/tree", label: "Ağaç", icon: <Network /> },
  { path: "/pending", label: "Bekleyenler", icon: <Users /> },
  { path: "/profile", label: "Profil", icon: <User /> },
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
        borderRadius: 20,
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
          "& .MuiBottomNavigationAction-root": { color: "rgba(255,255,255,0.6)", borderRadius: 17 },
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
