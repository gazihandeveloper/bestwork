"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, TriangleAlert, X } from "lucide-react";

interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity?: "success" | "error" | "info" | "warning";
  onClose: () => void;
}

const severityStyles: Record<NonNullable<AppSnackbarProps["severity"]>, string> = {
  success: "bg-primary text-primary-foreground",
  error: "bg-destructive text-destructive-foreground",
  info: "bg-primary text-primary-foreground",
  warning: "bg-secondary text-secondary-foreground",
};

const severityIcons: Record<NonNullable<AppSnackbarProps["severity"]>, ReactNode> = {
  success: <CheckCircle2 className="size-5 shrink-0" />,
  error: <AlertCircle className="size-5 shrink-0" />,
  info: <Info className="size-5 shrink-0" />,
  warning: <TriangleAlert className="size-5 shrink-0" />,
};

// Ortak Snackbar bileşeni: tüm sayfalarda tutarlı bildirim stili sağlar.
// 4 saniye sonra otomatik kapanır; kapatma butonu veya onClose ile kapatılabilir.
export default function AppSnackbar({ open, message, severity = "success", onClose }: AppSnackbarProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onCloseRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-4 left-1/2 z-[1400] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 ${severityStyles[severity]}`}
    >
      {severityIcons[severity]}
      <span>{message}</span>
      <button
        type="button"
        aria-label="Bildirimi kapat"
        onClick={onClose}
        className="ml-1 shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
