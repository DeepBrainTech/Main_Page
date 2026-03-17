"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DIMENSIONS } from "@/config/dimensions";
import type { CognitiveDimensionKey } from "@/types/cognitive";
import TestRunner from "./TestRunner";

/**
 * 脑力测试 Tab：选择维度后进入 TestRunner
 */
interface TestTabProps {
  dateOfBirth?: string | null;
}

export default function TestTab({ dateOfBirth }: TestTabProps) {
  const t = useTranslations("test");
  const tDim = useTranslations("dimensions");
  const [selected, setSelected] = useState<CognitiveDimensionKey | null>(null);

  if (selected !== null) {
    return (
      <TestRunner
        dimension={selected}
        onBack={() => setSelected(null)}
        dateOfBirth={dateOfBirth}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
      <p className="text-gray-600">{t("subtitle")}</p>
      <p className="text-sm text-amber-700">{t("freeUserLimit")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DIMENSIONS.map((dim) => (
          <button
            key={dim.key}
            type="button"
            onClick={() => setSelected(dim.key)}
            className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#5E81AC] hover:bg-sky-50"
          >
            <span className="font-semibold text-gray-800">{tDim(dim.key)}</span>
            <p className="mt-1 text-sm text-gray-500">{t("startTest")}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
