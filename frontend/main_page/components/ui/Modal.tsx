"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  busy?: boolean;
  dismissOnBackdrop?: boolean;
  backdropClassName?: string;
  onClose: () => void;
  className?: string;
}

export default function Modal({
  children,
  labelledBy,
  describedBy,
  busy = false,
  dismissOnBackdrop = true,
  backdropClassName = "backdrop:bg-black/35",
  onClose,
  className = "",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    // React does not set the native autofocus attribute on client-mounted buttons.
    dialog?.querySelector("[data-modal-autofocus]")?.setAttribute("autofocus", "");
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy && dismissOnBackdrop) onClose();
      }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain border-0 bg-white p-0 text-[#045E96] ${backdropClassName} ${className}`}
    >
      {children}
    </dialog>
  );
}
