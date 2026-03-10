"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** 矩阵推理占位：选缺失图形，简化成选数字 1-4 */
export default function MatrixReasoning({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.logic");
  const [selected, setSelected] = useState<number | null>(null);
  const correct = 2;

  const handleSubmit = () => {
    if (selected === null) return;
    const score = selected === correct ? 100 : 0;
    onComplete(score);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("matrixTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("matrixDesc")}</p>
      <p className="mb-2 text-sm text-gray-600">选出缺失的图形（占位：选 2）</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelected(n)}
            className={`rounded-lg border-2 px-4 py-2 ${selected === n ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={selected === null}
        className="mt-4 rounded-lg bg-[#5E81AC] px-4 py-2 text-white disabled:opacity-50"
      >
        {t("next")}
      </button>
    </div>
  );
}
