"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, primary confirm uses coral accent (destructive actions). */
  destructive?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  const confirmBtnClass = destructive
    ? "bg-[#E45C44] text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] hover:opacity-95"
    : "bg-sky-700 text-white hover:opacity-95";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 font-app-body"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[440px] rounded-3xl bg-white px-8 py-8 shadow-[0px_20px_40px_0px_rgba(0,0,0,0.20)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-2xl font-semibold leading-8 text-sky-700">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-4 text-lg font-normal leading-7 text-sky-700">
          {message}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-indigo-50 px-6 text-base font-medium text-sky-700 transition hover:bg-indigo-100 sm:flex-none sm:min-w-[7rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex h-12 flex-1 items-center justify-center rounded-2xl px-6 text-base font-medium transition sm:flex-none sm:min-w-[7rem] ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
