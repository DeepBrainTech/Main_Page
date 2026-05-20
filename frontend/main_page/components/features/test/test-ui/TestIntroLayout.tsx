"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  testCtaPrimaryClass,
  testCtaSecondaryClass,
  testInnerPanelClass,
  testIntroBodyClass,
  testTypeTitle,
} from "./testTheme";

interface TestIntroLayoutProps {
  title: string;
  description: string;
  onStartPractice: () => void;
  onStartTest: () => void;
  extra?: ReactNode;
}

/** Figma 开始页：标题 + 说明 + 可选扩展区 + 练习 / 正式测试双按钮 */
export default function TestIntroLayout({
  title,
  description,
  onStartPractice,
  onStartTest,
  extra,
}: TestIntroLayoutProps) {
  const t = useTranslations("test");

  return (
    <div className="flex min-h-[320px] w-full flex-col gap-6">
      <div className={`${testInnerPanelClass} flex flex-col gap-6`}>
        <h2 className={`font-bold text-[#045e96] ${testTypeTitle}`}>{title}</h2>
        <p className={testIntroBodyClass}>{description}</p>
        {extra ? <div>{extra}</div> : null}
      </div>

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-10">
        <button type="button" onClick={onStartPractice} className={testCtaSecondaryClass}>
          {t("startPractice")}
        </button>
        <button type="button" onClick={onStartTest} className={testCtaPrimaryClass}>
          {t("startTestCta")}
        </button>
      </div>
    </div>
  );
}
