"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchSecretPracticeReportHistory,
  type PracticeReportHistorySummary,
} from "@/lib/mentalMathPracticeProgress";

type PracticeReportHistoryPanelProps = {
  lessonKey: string;
  secretKey: string;
  secretTitle: string;
  onBack: () => void;
  onSelectReport: (reportId: number) => void;
};

function parseServerDate(iso: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

function formatDateOnly(iso: string | null): string {
  if (!iso) {
    return "-";
  }
  return parseServerDate(iso).toLocaleDateString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PracticeReportHistoryPanel({
  lessonKey,
  secretKey,
  secretTitle,
  onBack,
  onSelectReport,
}: PracticeReportHistoryPanelProps) {
  const tPractice = useTranslations("learning.practice");
  const tAssessment = useTranslations("learning.assessment");
  const [history, setHistory] = useState<PracticeReportHistorySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void fetchSecretPracticeReportHistory(lessonKey, secretKey)
      .then((result) => {
        if (!cancelled) {
          setHistory(result.list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lessonKey, secretKey]);

  return (
    <section className="rounded-[32px] border border-white/60 bg-white/60 p-[clamp(1.5rem,2.5vw,2rem)] shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold leading-none text-sky-700">{tPractice("practiceHistory")}</h2>
          <p className="text-base text-[#106FAA]">
            Secret {secretKey.replace("secret", "")}: {secretTitle}
          </p>
        </div>

        {historyLoading ? (
          <p className="text-sm text-gray-500">{tAssessment("historyLoading")}</p>
        ) : null}
        {!historyLoading && history.length === 0 ? (
          <p className="text-sm text-gray-500">{tAssessment("historyEmpty")}</p>
        ) : null}

        {history.length > 0 ? (
          <div className="flex max-h-[36rem] flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 py-2">
            {history.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectReport(session.id)}
                className="flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl bg-white/80 px-6 py-4 text-left transition duration-200 hover:scale-[1.01] hover:bg-[#D6E3F2] hover:shadow-[0px_10px_15px_0px_rgba(214,227,242,0.40)]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-normal leading-6 text-sky-700">
                    {session.attemptNumber}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-xl font-normal text-zinc-800">
                      {tPractice("historySessionLabel", { attempt: session.attemptNumber })}
                    </span>
                    <span className="text-base font-normal leading-5 text-sky-700">
                      {formatDateOnly(session.finishedAt)}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-right text-xl font-normal leading-6 text-zinc-800">
                      {tAssessment("historyScore", {
                        correct: session.correctCount,
                        total: session.totalQuestions,
                      })}
                    </span>
                    <span className="text-right text-base font-normal leading-5 text-sky-700">
                      {tAssessment("historyTime", { time: formatDuration(session.durationSeconds) })}
                    </span>
                  </span>
                  <span className="min-w-12 text-left text-2xl font-normal leading-7 text-green-500">
                    {session.accuracy}%
                  </span>
                  <span className="relative size-6 overflow-hidden" aria-hidden>
                    <span className="absolute left-[9px] top-[6px] h-3 w-3 rotate-45 border-r-2 border-t-2 border-zinc-800" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-indigo-50 px-6 py-4 text-base font-medium leading-6 text-sky-700 transition hover:bg-indigo-100"
          >
            {tPractice("historyBack")}
          </button>
        </div>
      </div>
    </section>
  );
}
