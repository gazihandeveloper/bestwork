import type { ReactNode } from "react";

// AdminLTE tarzı onay modalı (React state ile, Bootstrap modal sınıfları).
export default function ConfirmModal({
  open,
  title,
  children,
  confirmText = "Onayla",
  cancelText = "Vazgeç",
  busy = false,
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  tone?: "primary" | "danger" | "success" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="modal fade show d-block" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">{title}</h4>
              <button type="button" className="btn-close" aria-label="Kapat" onClick={onCancel} />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer justify-content-between">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>
                {cancelText}
              </button>
              <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
