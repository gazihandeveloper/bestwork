import type { ReactNode } from "react";
import Link from "next/link";

export interface BreadcrumbItem {
  text: string;
  href?: string;
}

// AdminLTE content-header: sayfa başlığı + açıklama + breadcrumb.
export default function PageHeader({
  title,
  subtitle,
  breadcrumb = [{ text: "Genel Bakış", href: "/" }],
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
}) {
  return (
    <div className="app-content-header">
      <div className="container-fluid">
        <div className="row">
          <div className="col-sm-6">
            <h1 className="mb-0 fs-3">{title}</h1>
            {subtitle && <div className="text-muted mt-1" style={{ fontSize: "0.9rem" }}>{subtitle}</div>}
          </div>
          <div className="col-sm-6">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb float-sm-end">
                {breadcrumb.map((b, i) => (
                  <li key={i} className={i === breadcrumb.length - 1 ? "breadcrumb-item active" : "breadcrumb-item"} aria-current={i === breadcrumb.length - 1 ? "page" : undefined}>
                    {b.href && i < breadcrumb.length - 1 ? <Link href={b.href}>{b.text}</Link> : b.text}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

// Kart başlığı + gövde sarmalayıcı (AdminLTE card).
export function PageCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`card card-primary card-outline ${className}`}>
      {title !== undefined && (
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h3 className="card-title">{title}</h3>
            {subtitle && <div className="text-muted" style={{ fontSize: "0.82rem" }}>{subtitle}</div>}
          </div>
          {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
}
