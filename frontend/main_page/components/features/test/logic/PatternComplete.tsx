"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** 规律补全：2 4 6 8 ? 选项 8 9 10 12，答案为 10 */
export default function PatternComplete({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.logic");
  const [selected, setSelected] = useState<number | null>(null);
  const options = [8, 9, 10, 12];
  const correct = 10;

  const handleSubmit = () => {
    if (selected === null) return;
    const score = selected === correct ? 100 : Math.max(0, 100 - Math.abs(selected - correct) * 25);
    onComplete(score);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("patternTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("patternDesc")}</p>
      <p className="mb-2 font-mono text-lg">2 · 4 · 6 · 8 · ?</p>
      <div className="flex flex-wrap gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelected(n)}
            className={`rounded-lg border-2 px-4 py-2 font-mono ${
              selected === n ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"
            }`}
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
