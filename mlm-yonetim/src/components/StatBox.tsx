import type { ReactNode } from "react";

// AdminLTE 4 resmi small-box markup'ı (text-bg-* + .small-box-icon).
export default function StatBox({
  color,
  icon,
  title,
  value,
  footer,
  children,
}: {
  color: "primary" | "info" | "success" | "warning" | "danger";
  icon: ReactNode; // Lucide ikon bileşeni
  title: string;
  value: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`small-box text-bg-${color}`}>
      <div className="inner">
        <h3>{value}</h3>
        <p>{title}</p>
        {children}
      </div>
      <span className="small-box-icon" aria-hidden="true">
        {icon}
      </span>
      {footer && <span className="small-box-footer">{footer}</span>}
    </div>
  );
}

// Yükleme göstergesi (spinner + metin).
export function Loading({ text = "Yükleniyor…" }: { text?: string }) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: "2.2rem", height: "2.2rem" }} />
      <div className="text-muted mt-2">{text}</div>
    </div>
  );
}

// Bootstrap alert sarmalayıcıları.
export function InfoAlert({ children }: { children: ReactNode }) {
  return <div className="alert alert-info py-2">{children}</div>;
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return <div className="alert alert-danger py-2">{children}</div>;
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return <div className="alert alert-success py-2">{children}</div>;
}

export function WarningAlert({ children }: { children: ReactNode }) {
  return <div className="alert alert-warning py-2">{children}</div>;
}

// Boş tablo durumu.
export function EmptyRow({ colSpan, text = "Kayıt yok." }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted py-4">
        {text}
      </td>
    </tr>
  );
}
