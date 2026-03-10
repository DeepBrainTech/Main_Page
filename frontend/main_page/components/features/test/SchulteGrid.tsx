"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

const SIZE = 5;
const TOTAL = SIZE * SIZE;

/** 舒尔特方格：5x5 乱序 1-25，按顺序点击 */
export default function SchulteGrid({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.focus");
  const [cells, setCells] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);

  const shuffled = useMemo(() => {
    const arr = Array.from({ length: TOTAL }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  useEffect(() => {
    setCells(shuffled);
    setStartTime(Date.now());
  }, [shuffled]);

  const handleCell = (value: number) => {
    if (value !== next) return;
    if (next === TOTAL) {
      const elapsed = Date.now() - (startTime ?? Date.now());
      const score = Math.min(100, Math.max(0, 100 - Math.floor(elapsed / 500)));
      onComplete(score);
    } else {
      setNext((n) => n + 1);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("schulteTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("schulteDesc")}</p>
      <p className="mb-2 text-sm text-gray-500">点击顺序：1 → {TOTAL}</p>
      <div className="inline-grid grid-cols-5 gap-1">
        {cells.map((val, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCell(val)}
            disabled={val < next}
            className={`flex h-10 w-10 items-center justify-center rounded border text-sm font-medium ${
              val < next ? "bg-green-100 text-green-800" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}
