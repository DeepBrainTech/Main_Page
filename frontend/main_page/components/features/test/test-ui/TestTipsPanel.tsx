"use client";

import type { ReactNode } from "react";
import { testTypeBody, testTypeTitle } from "./testTheme";

interface TestTipsPanelProps {
  title: string;
  children: ReactNode;
}

/** Figma spatial intro — Key Tips 黄底提示区 */
export default function TestTipsPanel({ title, children }: TestTipsPanelProps) {
  return (
    <div className="w-full rounded-2xl border-2 border-[rgba(255,180,35,0.3)] bg-[#fffbf0] px-6 py-5 sm:px-8 sm:py-6">
      <p className={`mb-4 font-semibold text-[#045e96] ${testTypeBody}`}>{title}</p>
      <div className={`space-y-3 ${testTypeBody}`}>{children}</div>
    </div>
  );
}
