"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useTestChrome } from "./TestChromeContext";
import {
  testChromeButtonClass,
  testSessionPillActive,
  testSessionPillDone,
  testSessionPillIdle,
  testShellClass,
} from "./testTheme";

interface TestRunnerShellProps {
  dimensionLabel: string;
  children: ReactNode;
}

export default function TestRunnerShell({ dimensionLabel, children }: TestRunnerShellProps) {
  const t = useTranslations("test");
  const { sessionIndex, sessionTotal, chrome, onSkipSession, hideSkip } = useTestChrome();

  const isIntro = chrome.screen === "intro";
  const showQuestionProgress = !isIntro && (chrome.questionTotal ?? 0) > 0;

  return (
    <div className="w-full min-w-0 font-app-body">
      <nav className="mb-4 text-base sm:text-lg" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li className="font-medium text-sky-600">{t("breadcrumbRoot")}</li>
          <li aria-hidden className="text-sky-400">
            ›
          </li>
          <li className="font-bold text-[#045e96]">{dimensionLabel}</li>
        </ol>
      </nav>

      <section className={testShellClass}>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4" role="group" aria-label="Sessions">
            {isIntro ? (
              Array.from({ length: sessionTotal }, (_, i) => {
                const active = i === sessionIndex;
                const done = i < sessionIndex;
                return (
                  <span
                    key={`session-${i}`}
                    className={active ? testSessionPillActive : done ? testSessionPillDone : testSessionPillIdle}
                  >
                    {t("sessionTab", { n: i + 1 })}
                  </span>
                );
              })
            ) : (
              <>
                <span className={testSessionPillActive}>{t("sessionTab", { n: sessionIndex + 1 })}</span>
                {showQuestionProgress ? (
                  <span className={testSessionPillIdle}>
                    {t("questionProgress", {
                      current: chrome.questionCurrent ?? 1,
                      total: chrome.questionTotal ?? 1,
                    })}
                  </span>
                ) : null}
              </>
            )}
          </div>

          {!hideSkip && (
            isIntro ? (
              <button type="button" className={testChromeButtonClass} onClick={() => {}}>
                {t("testHistory")}
              </button>
            ) : (
              <button type="button" onClick={onSkipSession} className={testChromeButtonClass}>
                {t("skipSession")}
              </button>
            )
          )}
        </header>

        <div className="test-typography w-full">{children}</div>
      </section>
    </div>
  );
}
