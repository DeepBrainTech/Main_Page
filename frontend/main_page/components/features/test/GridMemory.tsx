"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

const GRID_SIZE = 9;
const LIT_COUNT = 4;

/** 图形记忆：3x3 九个格子，四个亮 2 秒后隐藏，用户点击刚才亮的位置 */
export default function GridMemory({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.memory");
  const [phase, setPhase] = useState<"show" | "hide" | "done">("show");
  const [lit, setLit] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  const generate = useCallback(() => {
    const indices = new Set<number>();
    while (indices.size < LIT_COUNT) {
      indices.add(Math.floor(Math.random() * GRID_SIZE));
    }
    setLit(Array.from(indices));
    setPicked([]);
    setPhase("show");
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    if (phase !== "show") return;
    const id = setTimeout(() => setPhase("hide"), 2000);
    return () => clearTimeout(id);
  }, [phase]);

  const handleCell = (i: number) => {
    if (phase !== "hide") return;
    if (picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length === LIT_COUNT) {
      const correct = new Set(lit);
      const hit = next.filter((c) => correct.has(c)).length;
      const score = Math.min(100, Math.round((hit / LIT_COUNT) * 100));
      onComplete(score);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("gridTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("gridDesc")}</p>
      <div className="grid grid-cols-3 gap-2" style={{ width: 120 }}>
        {Array.from({ length: GRID_SIZE }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCell(i)}
            disabled={phase === "show"}
            className={`aspect-square rounded-lg border-2 transition ${
              phase === "show" && lit.includes(i)
                ? "border-amber-500 bg-amber-400"
                : phase === "hide"
                  ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  : "border-gray-200 bg-gray-50"
            } ${picked.includes(i) ? "bg-[#5E81AC] border-[#5E81AC]" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
