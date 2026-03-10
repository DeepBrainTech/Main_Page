"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

/** 空间想象力：两图形旋转后是否相同。简化：两个方块，一个旋转 90° 后是否与另一个相同 */
export default function ShapeRotation({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.spatial");
  const [same, setSame] = useState<boolean | null>(null);
  const isSame = useMemo(() => Math.random() > 0.5, []);

  const handleSubmit = () => {
    if (same === null) return;
    const score = same === isSame ? 100 : 0;
    onComplete(score);
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("title")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("desc")}</p>
      <div className="mb-4 flex justify-center gap-8">
        <div className="h-16 w-16 rounded-lg bg-amber-400" />
        <div
          className="h-16 w-16 rounded-lg bg-amber-400"
          style={{ transform: isSame ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </div>
      <p className="mb-2 text-sm text-gray-600">旋转后是否相同？</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSame(true)}
          className={`rounded-lg border-2 px-4 py-2 ${same === true ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"}`}
        >
          相同
        </button>
        <button
          type="button"
          onClick={() => setSame(false)}
          className={`rounded-lg border-2 px-4 py-2 ${same === false ? "border-[#5E81AC] bg-[#5E81AC] text-white" : "border-gray-300"}`}
        >
          不同
        </button>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={same === null}
        className="mt-4 rounded-lg bg-[#5E81AC] px-4 py-2 text-white disabled:opacity-50"
      >
        提交
      </button>
    </div>
  );
}
