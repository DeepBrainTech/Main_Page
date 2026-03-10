"use client";

import { useTranslations } from "next-intl";

interface HomesteadBlockProps {
  coins: number;
  diamonds: number;
}

/**
 * 家园简版：金币/钻石展示 + 卡通占位
 */
export default function HomesteadBlock({ coins, diamonds }: HomesteadBlockProps) {
  const tHome = useTranslations("home");

  return (
    <div className="rounded-xl bg-white p-4 shadow-md">
      <h3 className="mb-3 font-semibold text-gray-800">{tHome("homestead")}</h3>
      <p className="mb-4 text-sm text-gray-600">{tHome("homesteadDesc")}</p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2">
          <span className="text-lg">🪙</span>
          <span className="font-semibold text-amber-800">
            {tHome("coins")}: {coins}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2">
          <span className="text-lg">💎</span>
          <span className="font-semibold text-sky-800">
            {tHome("diamonds")}: {diamonds}
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-gray-100 py-12">
        <span className="text-6xl opacity-60">🧸</span>
        <p className="mt-2 text-sm text-gray-500">{tHome("homesteadPlaceholder")}</p>
      </div>
    </div>
  );
}
