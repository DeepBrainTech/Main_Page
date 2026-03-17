"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const COLORS = ["red", "green", "blue"] as const;
type Color = (typeof COLORS)[number];

/** Stroop：根据字体颜色选择，忽略文字含义。题目 "Click the word displayed in red"，选项为 blue(红字) red(绿字) green(蓝字)，正确答案为显示红色的那个即 Blue 选项 */
export default function StroopColor({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.focus");
  const [targetColor, setTargetColor] = useState<Color>("red");
  const [options, setOptions] = useState<{ word: Color; font: Color }[]>([]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (options.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h4 className="mb-2 font-semibold text-gray-800">{t("stroopTitle")}</h4>
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  useEffect(() => {
    const target: Color = COLORS[Math.floor(Math.random() * 3)];
    const opts = COLORS.map((word) => ({
      word,
      font: COLORS[Math.floor(Math.random() * 3)] as Color,
    })).sort(() => Math.random() - 0.5);
    const idx = opts.findIndex((o) => o.font === target);
    setTargetColor(target);
    setOptions(opts);
    setCorrectIndex(idx >= 0 ? idx : 0);
    setSelected(null);
  }, []);

  const handleSelect = (i: number) => {
    setSelected(i);
    const score = i === correctIndex ? 100 : 0;
    setTimeout(() => onComplete(score), 300);
  };

  const colorClass = (c: Color) =>
    c === "red" ? "text-red-600" : c === "green" ? "text-green-600" : "text-blue-600";

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("stroopTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("stroopDesc")}</p>
      <p className="mb-4 text-gray-700">
        点击<strong>字体颜色为 {targetColor === "red" ? "红色" : targetColor === "green" ? "绿色" : "蓝色"}</strong>的选项
      </p>
      <div className="flex flex-wrap gap-3">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            className={`rounded-lg border-2 px-4 py-2 font-medium capitalize ${colorClass(opt.font)} ${
              selected !== null ? "opacity-80" : "hover:bg-gray-50"
            }`}
            disabled={selected !== null}
          >
            {opt.word}
          </button>
        ))}
      </div>
    </div>
  );
}
