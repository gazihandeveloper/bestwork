"use client";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity?: "success" | "error" | "info" | "warning";
  onClose: () => void;
}

// Ortak Snackbar bileşeni: tüm sayfalarda tutarlı bildirim stili sağlar.
export default function AppSnackbar({ open, message, severity = "success", onClose }: AppSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={severity} variant="filled" onClose={onClose} sx={{ width: "100%", borderRadius: 2.1 }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
