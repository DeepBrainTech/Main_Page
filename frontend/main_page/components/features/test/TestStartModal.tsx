"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { TEST_DIMENSION_ICON_SRC, TEST_DIMENSION_RING } from "./testDimensionAssets";
import { getTestEstimateMinutes, getTestSectionCount } from "./testHubUtils";

interface TestStartModalProps {
  dimension: CognitiveDimensionKey;
  onClose: () => void;
  onConfirm: () => void;
}

function ClipboardGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM7 6H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StopwatchGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="14" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 10v4l2.5 1.5M9 3h6M12 3v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 选中维度后的居中确认弹窗（Figma node 416-4947）
 */
export default function TestStartModal({ dimension, onClose, onConfirm }: TestStartModalProps) {
  const t = useTranslations("test");
  const tDim = useTranslations("dimensions");

  const sectionCount = getTestSectionCount(dimension);
  const minutes = getTestEstimateMinutes(dimension);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label={t("modalClose")}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-start-modal-title"
        className="relative w-full max-w-[400px] rounded-3xl bg-white p-6 font-app-body shadow-2xl shadow-slate-900/15 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#1565C0] transition hover:bg-sky-50"
          aria-label={t("modalClose")}
        >
          <span className="text-xl leading-none" aria-hidden>
            ×
          </span>
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-md"
            style={{ backgroundColor: TEST_DIMENSION_RING[dimension] }}
          >
            <Image
              src={TEST_DIMENSION_ICON_SRC[dimension]}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>

          <h2 id="test-start-modal-title" className="mt-5 text-xl font-bold text-[#003366] sm:text-2xl">
            {t("modalDimensionTitle", { dimension: tDim(dimension) })}
          </h2>
          <p className="mt-2 text-sm font-medium text-[#1565C0]">{t("modalSubtitle")}</p>
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-sky-50/90 px-4 py-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <ClipboardGlyph className="h-5 w-5 text-[#1565C0]" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-bold text-[#1565C0]">
                {t("modalSectionsTitle", { count: sectionCount })}
              </div>
              <div className="mt-0.5 text-xs text-sky-600/90">{t("modalSectionsHint")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-sky-50/90 px-4 py-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <StopwatchGlyph className="h-5 w-5 text-[#1565C0]" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-bold text-[#1565C0]">
                {t("modalTimeTitle", { minutes })}
              </div>
              <div className="mt-0.5 text-xs text-sky-600/90">{t("modalTimeHint")}</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-8 w-full rounded-full bg-[#EE664A] py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-[#e0553a] active:scale-[0.99]"
        >
          {t("modalStartFree")}
        </button>
      </div>
    </div>
  );
}
