"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { getSettings } from "@/services/api";
import Reveal from "./Reveal";
import { ELEVATION, MOTION } from "./tokens";
import { alpha } from "@mui/material/styles";

const DEFAULT_SETTINGS: Record<string, string> = {
  corporate_title: "Kurumsal",
  corporate_description:
    "BestWork, Binary MLM komisyon sistemi ile e-ticareti tek çatıda buluşturan modern bir platformdur.",
  corporate_address: "İstanbul, Türkiye",
  corporate_phone: "0850 000 00 00",
  corporate_email: "destek@bestwork.com",
  corporate_hours: "Pzt - Cmt: 09.00 - 18.00",
};

const contactItems = [
  { key: "corporate_address", label: "Adres", icon: <LocationOnRoundedIcon /> },
  { key: "corporate_phone", label: "Telefon", icon: <PhoneRoundedIcon /> },
  { key: "corporate_email", label: "E-posta", icon: <MailRoundedIcon /> },
  { key: "corporate_hours", label: "Çalışma Saatleri", icon: <ScheduleRoundedIcon /> },
];

// Kurumsal bölümü — içerik DB'den (GET /api/settings) gelir, admin panelinden düzenlenir.
export default function Corporate() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (active) setSettings({ ...DEFAULT_SETTINGS, ...s });
      })
      .catch((err: unknown) => {
        console.error("Kurumsal içerik yüklenemedi:", err);
        if (active) setSettings(DEFAULT_SETTINGS);
      });
    return () => {
      active = false;
    };
  }, []);

  if (settings === null) {
    return (
      <Box component="section" id="kurumsal" sx={{ py: 8, bgcolor: "background.paper" }}>
        <Container maxWidth={false}>
          <Skeleton variant="rounded" height={260} />
        </Container>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      id="kurumsal"
      sx={{
        py: 8,
        scrollMarginTop: "96px",
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${alpha(
            theme.palette.secondary.main,
            0.3,
          )} 100%)`,
      }}
    >
      <Container maxWidth={false}>
        <Reveal>
          <Box sx={{ textAlign: "center", mb: 5, maxWidth: 720, mx: "auto" }}>
            <Typography variant="h2" sx={{ fontWeight: 700, color: "primary.dark" }}>
              {settings.corporate_title || "Kurumsal"}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
              {settings.corporate_description}
            </Typography>
          </Box>
        </Reveal>

        <Grid container spacing={2.5}>
          {contactItems.map((item, i) => {
            const value = settings[item.key] ?? "";
            return (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.key}>
                <Reveal delay={i * 70} sx={{ height: "100%" }}>
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      textAlign: "center",
                      p: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "20px",
                      boxShadow: ELEVATION.l1,
                      transition: `box-shadow 250ms ${MOTION.standard}, transform 250ms ${MOTION.standard}`,
                      "&:hover": { boxShadow: ELEVATION.l2, transform: "translateY(-4px)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                        color: "primary.dark",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.5,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, mt: 0.25, wordBreak: "break-word" }}
                    >
                      {value || "—"}
                    </Typography>
                  </Card>
                </Reveal>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
