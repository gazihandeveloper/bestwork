"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { listBenefits } from "@/services/api";
import type { Benefit } from "@/services/api";
import Reveal from "./Reveal";
import { ELEVATION, MOTION } from "./tokens";

// İkon anahtarları (admin panelindeki seçimle eşleşir)
const ICONS: Record<string, React.ReactNode> = {
  shipping: <LocalShippingRoundedIcon />,
  payment: <VerifiedUserRoundedIcon />,
  pv: <RedeemRoundedIcon />,
  support: <SupportAgentRoundedIcon />,
};

const fallbackBenefits: Benefit[] = [
  { id: -1, title: "Kargo Bedava", description: "500 TL ve üzeri siparişlerde", icon: "shipping", sort_order: 1, is_active: true, created_at: "" },
  { id: -2, title: "Güvenli Ödeme", description: "Kredi kartı ve EFT/HAVALE", icon: "payment", sort_order: 2, is_active: true, created_at: "" },
  { id: -3, title: "PV/CV Puan", description: "Her ürün seviye atlatır", icon: "pv", sort_order: 3, is_active: true, created_at: "" },
  { id: -4, title: "7/24 Destek", description: "Her zaman yanınızdayız", icon: "support", sort_order: 4, is_active: true, created_at: "" },
];

// Avantaj şeridi — içerik admin panelinden yönetilir (GET /api/benefits).
export default function Benefits() {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);

  useEffect(() => {
    let active = true;
    listBenefits()
      .then((bs) => {
        if (active) setBenefits(bs.length > 0 ? bs : fallbackBenefits);
      })
      .catch((err: unknown) => {
        console.error("Avantaj kartları yüklenemedi:", err);
        if (active) setBenefits(fallbackBenefits);
      });
    return () => {
      active = false;
    };
  }, []);

  if (benefits === null) {
    return (
      <Box component="section" sx={{ py: 4, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Grid container spacing={2}>
            {[0, 1, 2, 3].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                <Skeleton variant="rounded" height={84} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  return (
    <Box component="section" id="avantajlar" sx={{ py: 4, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Grid container spacing={2}>
          {benefits.map((item, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.id}>
              <Reveal delay={i * 60} sx={{ height: "100%" }}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: (theme) => theme.palette.divider,
                    boxShadow: ELEVATION.l1,
                    transition: `box-shadow 250ms ${MOTION.standard}, transform 250ms ${MOTION.standard}`,
                    "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-3px)" },
                  }}
                >
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      bgcolor: "secondary.main",
                      color: "primary.dark",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {ICONS[item.icon] ?? ICONS.shipping}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h3"
                      sx={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3, wordBreak: "break-word" }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25, fontSize: "0.8rem", lineHeight: 1.35, wordBreak: "break-word" }}
                    >
                      {item.description}
                    </Typography>
                  </Box>
                </Card>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
