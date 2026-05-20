"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CognitiveDimensionKey } from "@/types/cognitive";

export type TestChromeScreen = "intro" | "active";

export interface TestChromeState {
  screen: TestChromeScreen;
  questionCurrent?: number;
  questionTotal?: number;
  /** Display string e.g. "03:00" */
  timerLabel?: string;
}

const DEFAULT_CHROME: TestChromeState = { screen: "intro" };

interface TestChromeContextValue {
  dimension: CognitiveDimensionKey;
  sessionIndex: number;
  sessionTotal: number;
  sessionLabels: string[];
  chrome: TestChromeState;
  setChrome: (state: TestChromeState) => void;
  onSkipSession: () => void;
}

const TestChromeContext = createContext<TestChromeContextValue | null>(null);

export function TestChromeProvider({
  dimension,
  sessionIndex,
  sessionTotal,
  sessionLabels,
  onSkipSession,
  children,
}: {
  dimension: CognitiveDimensionKey;
  sessionIndex: number;
  sessionTotal: number;
  sessionLabels: string[];
  onSkipSession: () => void;
  children: ReactNode;
}) {
  const [chrome, setChrome] = useState<TestChromeState>(DEFAULT_CHROME);

  useEffect(() => {
    setChrome(DEFAULT_CHROME);
  }, [sessionIndex]);

  const value = useMemo(
    () => ({
      dimension,
      sessionIndex,
      sessionTotal,
      sessionLabels,
      chrome,
      setChrome,
      onSkipSession,
    }),
    [dimension, sessionIndex, sessionTotal, sessionLabels, chrome, onSkipSession]
  );

  return <TestChromeContext.Provider value={value}>{children}</TestChromeContext.Provider>;
}

export function useTestChrome() {
  const ctx = useContext(TestChromeContext);
  if (!ctx) throw new Error("useTestChrome must be used within TestChromeProvider");
  return ctx;
}

/** 子测试同步顶栏状态（intro → Test History；active → Skip Session + 题号） */
export function useReportTestChrome(state: TestChromeState) {
  const { setChrome } = useTestChrome();
  const { screen, questionCurrent, questionTotal, timerLabel } = state;

  useEffect(() => {
    setChrome({ screen, questionCurrent, questionTotal, timerLabel });
  }, [screen, questionCurrent, questionTotal, timerLabel, setChrome]);
}

export function formatTimerMmSs(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
