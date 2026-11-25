"use client";

import { useId } from "react";
import Modal from "./Modal";

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
  const titleId = useId();
  const messageId = useId();

  if (!open) {
    return null;
  }

  const confirmBtnClass = destructive
    ? "bg-[#E45C44] text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] hover:opacity-95"
    : "bg-sky-700 text-white hover:opacity-95";

  return (
    <Modal
      className="max-w-[27.5rem] rounded-3xl font-app-body shadow-[0px_20px_40px_0px_rgba(0,0,0,0.20)]"
      labelledBy={titleId}
      describedBy={messageId}
      onClose={onCancel}
    >
      <div className="p-8">
        <h2 id={titleId} className="text-2xl font-semibold leading-8 text-sky-700">
          {title}
        </h2>
        <p id={messageId} className="mt-4 text-lg font-normal leading-7 text-sky-700">
          {message}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-modal-autofocus
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
    </Modal>
  );
}
