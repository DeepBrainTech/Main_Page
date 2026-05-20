"use client";

import type { ReactNode } from "react";
import { testInnerPanelClass, testTypeBody, testTypeSession, testTypeTitle } from "./testTheme";

interface TestActiveLayoutProps {
  title: string;
  /** 居中 Memorize items */
  prompt?: string;
  timerLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function TimerBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-full bg-[#e45c44] px-5 font-medium tabular-nums text-white ${testTypeSession}`}
    >
      {label}
    </span>
  );
}

/** Figma 进行中 居中提示/计时 */
export default function TestActiveLayout({
  title,
  prompt,
  timerLabel,
  children,
  footer,
}: TestActiveLayoutProps) {
  return (
    <div className={`${testInnerPanelClass} flex min-h-[360px] w-full flex-col gap-8 sm:gap-10`}>
      <h2 className={`font-bold ${testTypeTitle}`}>{title}</h2>

      {(prompt || timerLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {prompt ? <p className={`text-center font-normal ${testTypeBody}`}>{prompt}</p> : null}
          {timerLabel ? <TimerBadge label={timerLabel} /> : null}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center py-4 sm:py-6">{children}</div>

      {footer ? <div className="w-full">{footer}</div> : null}
    </div>
  );
}
