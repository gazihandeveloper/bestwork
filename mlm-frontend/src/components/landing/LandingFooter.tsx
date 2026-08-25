"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import MuiLink from "@mui/material/Link";
import { FOOTER_BG, FOOTER_TEXT } from "./tokens";

const platformLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/shop", label: "Ürünler" },
  { href: "/#kurumsal", label: "Kurumsal" },
  { href: "/#iletisim", label: "İletişim" },
];

const accountLinks = [
  { href: "/register", label: "Kayıt Ol" },
  { href: "/login", label: "Giriş" },
  { href: "/shop", label: "Alışveriş" },
];

const linkSx = {
  display: "block",
  mb: 1,
  color: "rgba(255,255,255,0.85)",
  textDecoration: "underline",
  "&:hover": { color: "#FFFFFF", textDecorationColor: "#FFFFFF" },
};

// Landing footer — m3.material.io'nun koyu footer'ı gibi.
export default function LandingFooter() {
  return (
    <Box
      component="footer"
      id="iletisim"
      sx={{
        bgcolor: FOOTER_BG,
        color: FOOTER_TEXT,
        py: 6,
        borderTop: "1px solid",
        borderColor: "rgba(255,255,255,0.15)",
      }}
    >
      <Container maxWidth={false}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Typography component="span" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                BestWork
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: FOOTER_TEXT, maxWidth: 280 }}>
              Binary MLM ve e-ticaretin buluştuğu platform.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Typography component="h4" variant="subtitle1" sx={{ fontWeight: 700, color: "common.white", mb: 1.5 }}>
              Platform
            </Typography>
            {platformLinks.map((l) => (
              <MuiLink key={l.href} component={Link} href={l.href} sx={linkSx}>
                {l.label}
              </MuiLink>
            ))}
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography component="h4" variant="subtitle1" sx={{ fontWeight: 700, color: "common.white", mb: 1.5 }}>
              Hesap
            </Typography>
            {accountLinks.map((l) => (
              <MuiLink key={l.href} component={Link} href={l.href} sx={linkSx}>
                {l.label}
              </MuiLink>
            ))}
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Typography component="h4" variant="subtitle1" sx={{ fontWeight: 700, color: "common.white", mb: 1.5 }}>
              İletişim
            </Typography>
            <Typography variant="body2" sx={{ color: FOOTER_TEXT, mb: 0.5 }}>
              Destek: destek@bestwork.com
            </Typography>
            <Typography variant="body2" sx={{ color: FOOTER_TEXT }}>
              Çalışma saatleri: 09.00 - 18.00
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.15)" }} />

        <Box>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
            © 2026 BestWork. Tüm hakları saklıdır.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
