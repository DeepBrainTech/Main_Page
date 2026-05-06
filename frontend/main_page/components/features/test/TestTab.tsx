"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";
import BrainpowerPanel from "@/components/features/dashboard/BrainpowerPanel";
import TestRunner from "./TestRunner";
import TestStartModal from "./TestStartModal";
import { TEST_DIMENSION_ICON_SRC, TEST_DIMENSION_RING } from "./testDimensionAssets";
import { TEST_HUB_GRID_ORDER } from "./testHubUtils";

interface TestTabProps {
  dateOfBirth?: string | null;
}

/**
 * 脑力测试 Tab：Figma 2×3 维度卡片 → 居中确认弹窗 → TestRunner；右侧脑力图谱
 */
export default function TestTab({ dateOfBirth }: TestTabProps) {
  const t = useTranslations("test");
  const tDim = useTranslations("dimensions");
  const tCard = useTranslations("test.dimensionCard");
  const { scores, loading, refresh } = useCognitiveScores();
  const [runnerDimension, setRunnerDimension] = useState<CognitiveDimensionKey | null>(null);
  const [modalDimension, setModalDimension] = useState<CognitiveDimensionKey | null>(null);

  const handleBackFromRunner = () => {
    setRunnerDimension(null);
    void refresh();
  };

  if (runnerDimension !== null) {
    return (
      <TestRunner dimension={runnerDimension} onBack={handleBackFromRunner} dateOfBirth={dateOfBirth} />
    );
  }

  return (
    <div className="flex flex-col gap-8 font-app-body lg:gap-10 xl:flex-row xl:items-start">
      {modalDimension !== null ? (
        <TestStartModal
          dimension={modalDimension}
          onClose={() => setModalDimension(null)}
          onConfirm={() => {
            setRunnerDimension(modalDimension);
            setModalDimension(null);
          }}
        />
      ) : null}

      <div className="min-w-0 flex-1 space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-md sm:p-7">
          <h2 className="text-xl font-bold tracking-tight text-[#003366] sm:text-2xl">{t("title")}</h2>
          <p className="mt-2 text-sm font-normal leading-relaxed text-slate-600">{t("freeUserLimit")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEST_HUB_GRID_ORDER.map((key) => {
            const v = scores[key];
            const hasScore = !loading && v > 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setModalDimension(key)}
                className="flex flex-col items-start rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-300/70 hover:shadow-md"
              >
                <span className="flex items-start justify-between gap-2 self-stretch">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full shadow-sm"
                    style={{ backgroundColor: TEST_DIMENSION_RING[key] }}
                    aria-hidden
                  >
                    <Image
                      src={TEST_DIMENSION_ICON_SRC[key]}
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-[26px] object-contain"
                    />
                  </span>
                  {hasScore ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 tabular-nums">
                      {v}
                    </span>
                  ) : null}
                </span>
                <span className="mt-4 text-base font-bold tracking-tight text-[#003366]">{tDim(key)}</span>
                <span className="mt-2 text-sm font-normal leading-snug text-slate-600">{tCard(key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full shrink-0 xl:sticky xl:top-24 xl:max-w-[min(100%,calc(28rem*1.1))]">
        <BrainpowerPanel scores={scores} />
      </div>
    </div>
  );
}
