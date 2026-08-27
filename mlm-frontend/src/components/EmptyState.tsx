"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
}

// Boş liste durumları için şık placeholder.
export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="py-6 text-center text-muted-foreground">
      {icon && <div className="mb-1 flex justify-center text-primary-light">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}
