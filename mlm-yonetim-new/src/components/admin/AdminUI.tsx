import React from "react";

// bestmanager2 yönetim sayfaları için ortak Tailwind UI parçaları.

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B] ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function AdminBtn({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "sm",
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "success" | "danger" | "outline" | "info" | "ghost";
  size?: "sm" | "xs";
  className?: string;
  type?: "button" | "submit";
}) {
  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    success: "bg-success-500 text-white hover:bg-success-600",
    danger: "bg-error-500 text-white hover:bg-error-600",
    info: "bg-blue-light-500 text-white hover:bg-blue-light-600",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]",
    ghost: "text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10",
  };
  const sizes = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3.5 py-2 text-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${sizes[size]} ${variants[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminBadge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: "green" | "red" | "amber" | "blue" | "gray" | "purple";
}) {
  const map: Record<string, string> = {
    green:
      "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
    red: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
    amber:
      "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-300",
    blue: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
    purple:
      "bg-[#7239ea]/10 text-[#7239ea] dark:bg-[#7239ea]/20 dark:text-[#c5a6ff]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}
    >
      {children}
    </span>
  );
}

export function AdminAlert({
  kind,
  children,
}: {
  kind: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    success:
      "border-success-500/30 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
    error:
      "border-error-500/30 bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
    warning:
      "border-warning-500/30 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-orange-300",
  };
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}

export function AdminSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14">
      <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {children}
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  tone = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center overflow-y-auto p-4">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1E293B]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3
            className={`text-lg font-semibold ${
              tone === "danger" ? "text-error-600 dark:text-error-400" : "text-gray-800 dark:text-white/90"
            }`}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-gray-500";

export const labelCls =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

export const tableWrapCls =
  "overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800";

export const tableCls = "min-w-full text-sm";

export const thCls =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

export const tdCls = "px-4 py-3 align-middle";
