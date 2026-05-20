"use client";

import type { ReactNode } from "react";
import { testBadgeClass, testInnerPanelClass, testMetaClass, testTypeTitle } from "./testTheme";

interface TestPhasePanelProps {
  title: string;
  badge?: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** 练习/正式阶段内容区 */
export default function TestPhasePanel({
  title,
  badge,
  meta,
  children,
  footer,
  className = "",
}: TestPhasePanelProps) {
  return (
    <div className={`${testInnerPanelClass} flex flex-col gap-4 ${className}`.trim()}>
      <h2 className={`font-bold ${testTypeTitle}`}>{title}</h2>
      {badge ? <span className={testBadgeClass}>{badge}</span> : null}
      {meta ? <div className={testMetaClass}>{meta}</div> : null}
      {children}
      {footer}
    </div>
  );
}
