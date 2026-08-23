"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
}

// Boş liste durumları için şık placeholder.
export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
      {icon && <Box sx={{ mb: 1, "& svg": { fontSize: 48, color: "primary.light" } }}>{icon}</Box>}
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}
