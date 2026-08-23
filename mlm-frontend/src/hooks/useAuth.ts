"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

// AuthContext'i tüketen hook.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth, AuthProvider içinde kullanılmalıdır");
  }
  return ctx;
}
