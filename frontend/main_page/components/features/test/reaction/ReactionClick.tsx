"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/** 反应速度：屏幕随机变色后用户点击，计反应时间 */
export default function ReactionClick({ onComplete }: { onComplete: (score: number) => void }) {
  const t = useTranslations("test.reaction");
  const [phase, setPhase] = useState<"wait" | "ready" | "click">("wait");
  const [startTime, setStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "wait") return;
    const delay = 2000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setPhase("ready");
      setStartTime(Date.now());
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase]);

  const handleClick = () => {
    if (phase === "ready") {
      const ms = Date.now() - startTime;
      const score = Math.min(100, Math.max(0, 100 - Math.floor(ms / 30)));
      onComplete(score);
    } else if (phase === "wait") {
      // 提前点了，可重置
      setPhase("wait");
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h4 className="mb-2 font-semibold text-gray-800">{t("title")}</h4>
      <p className="mb-4 text-sm text-gray-600">{t("desc")}</p>
      <button
        type="button"
        onClick={handleClick}
        className={`h-40 w-full rounded-xl transition ${
          phase === "wait" ? "bg-gray-300" : phase === "ready" ? "bg-green-500" : "bg-gray-200"
        }`}
      >
        {phase === "wait" && "等待变色..."}
        {phase === "ready" && "点击！"}
      </button>
    </div>
  );
}
