"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** 最短路径占位：10x8 网格，可斜走，选步数。简化版：只做步数选择 */
const W = 10;
const H = 8;

export default function ShortestPath({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.strategy");
  const [step, setStep] = useState<number | null>(null);
  const minSteps = Math.max(W - 1, H - 1);
  const options = [minSteps, minSteps + 2, minSteps + 5, minSteps + 8];

  const handleSubmit = () => {
    if (step === null) return;
    const score = step === minSteps ? 100 : Math.max(0, 100 - Math.abs(step - minSteps) * 15);
    onComplete(score);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("pathTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("pathDesc")}</p>
      <p className="mb-2 text-sm text-gray-600">
        {W}×{H} 网格，从左上到右下可斜走，最少需要多少步？
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n)}
            className={`rounded-lg border-2 px-4 py-2 ${step === n ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"}`}
          >
            {n} 步
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={step === null}
        className="mt-4 rounded-lg bg-[#5E81AC] px-4 py-2 text-white disabled:opacity-50"
      >
        提交
      </button>
    </div>
  );
}
