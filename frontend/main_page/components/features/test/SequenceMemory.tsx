"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

/** 序列记忆：显示数字串 2 秒后隐藏，用户输入 */
export default function SequenceMemory({
  onComplete,
  length = 5,
}: {
  onComplete: (score: number) => void;
  length?: number;
}) {
  const t = useTranslations("test.memory");
  const [phase, setPhase] = useState<"show" | "hide" | "done">("show");
  const [sequence, setSequence] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const generate = useCallback(() => {
    const arr = Array.from({ length }, () => String(Math.floor(Math.random() * 10)));
    setSequence(arr);
    setPhase("show");
    setInput("");
    setError(false);
  }, [length]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("hide"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleSubmit = () => {
    const user = input.trim().replace(/\s/g, "");
    const correct = sequence.join("");
    if (user === correct) {
      const score = Math.min(100, Math.round((correct.length / 8) * 100));
      onComplete(score);
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
        setInput("");
      }, 800);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("sequenceTitle")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("sequenceDesc")}</p>
      {phase === "show" && (
        <div className="mb-4 flex justify-center gap-2 text-3xl font-mono tracking-widest text-[#5E81AC]">
          {sequence.join(" ")}
        </div>
      )}
      {phase === "hide" && (
        <>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, length))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className={`w-full max-w-xs rounded-lg border px-4 py-2 text-center font-mono text-xl ${
              error ? "border-red-500 bg-red-50" : "border-gray-300"
            }`}
            placeholder="输入刚才的数字"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 rounded-lg bg-[#5E81AC] px-4 py-2 text-white hover:bg-[#4E719C]"
          >
            {t("next")}
          </button>
        </>
      )}
    </div>
  );
}
