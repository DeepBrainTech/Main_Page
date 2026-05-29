"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AssessmentAnswerPayload, AssessmentTrendPoint } from "@/services/userApi";

const QUESTION_GRID_PREV_PATH =
  "M16 12H8M12 16L8 12L12 8M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z";
const QUESTION_GRID_NEXT_PATH =
  "M8 12H16M12 16L16 12L12 8M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z";

type AnswerFilter = "all" | "incorrect" | "timeout" | "correct" | "topics";

export interface AssessmentReportTopicStat {
  topic_key: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AssessmentReportCategoryStat {
  category: string;
  accuracy: number;
  topics: AssessmentReportTopicStat[];
}

interface AssessmentReportProps {
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  timeoutCount: number;
  durationSeconds: number;
  attemptNumber: number;
  trend: AssessmentTrendPoint[];
  answers: AssessmentAnswerPayload[];
  categoryStats: AssessmentReportCategoryStat[];
  topicLabel: (topicKey: string) => string;
  categoryLabel: (category: string) => string;
  onOpenHistory: () => void;
  onRetake: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseServerDate(iso: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

function formatTrendTick(iso: string): string {
  const d = parseServerDate(iso);
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
}

export default function AssessmentReport({
  accuracy,
  correctCount,
  totalQuestions,
  timeoutCount,
  durationSeconds,
  attemptNumber,
  trend,
  answers,
  categoryStats,
  topicLabel,
  categoryLabel,
  onOpenHistory,
  onRetake,
}: AssessmentReportProps) {
  const t = useTranslations("learning");
  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");
  const [answerPage, setAnswerPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const incorrectCount = Math.max(0, totalQuestions - correctCount - timeoutCount);

  const filteredAnswers = useMemo(() => {
    if (answerFilter === "topics") return [];
    if (answerFilter === "all") return answers;
    if (answerFilter === "timeout") return answers.filter((x) => x.is_timeout);
    if (answerFilter === "correct") return answers.filter((x) => x.is_correct);
    return answers.filter((x) => !x.is_correct && !x.is_timeout);
  }, [answerFilter, answers]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredAnswers.length / pageSize));
  const safePage = Math.min(answerPage, totalPages);
  const pageRows = filteredAnswers.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setAnswerPage(1);
  }, [answerFilter]);

  const displayTrend = useMemo(() => {
    return trend.slice(-5);
  }, [trend]);

  const trendChart = useMemo(() => {
    if (displayTrend.length < 2) {
      return { polyline: "", dots: [] as Array<{ x: number; y: number; label: string; accuracy: number }>, ticks: [] as Array<{ x: number; label: string }> };
    }
    const left = 8;
    const right = 82;
    const top = 14;
    const bottom = 76;
    const span = Math.max(1, displayTrend.length - 1);
    const dots = displayTrend.map((point, index) => {
      const ratioX = index / span;
      const x = left + (right - left) * ratioX;
      const y = bottom - ((bottom - top) * point.accuracy) / 100;
      return { x, y, label: formatTrendTick(point.finished_at), accuracy: point.accuracy };
    });
    const polyline = dots.map((p) => `${p.x},${p.y}`).join(" ");
    const ticks = dots.map((dot) => ({ x: dot.x, label: dot.label }));
    return { polyline, dots, ticks };
  }, [displayTrend]);

  const donutGradient = useMemo(() => {
    const total = totalQuestions || 1;
    const c = Math.round((correctCount / total) * 100);
    const i = Math.round((incorrectCount / total) * 100);
    return `conic-gradient(#4ADE80 0 ${c}%, #E45C44 ${c}% ${c + i}%, #FFB423 ${c + i}% 100%)`;
  }, [correctCount, incorrectCount, totalQuestions]);

  const reportBand = useMemo(() => {
    if (accuracy >= 80) return "superstar";
    if (accuracy >= 60) return "strongSolver";
    if (accuracy >= 40) return "greatStarter";
    return "keepPracticing";
  }, [accuracy]);

  const trendAverage = useMemo(() => {
    if (displayTrend.length === 0) return 0;
    return Math.round(displayTrend.reduce((sum, point) => sum + point.accuracy, 0) / displayTrend.length);
  }, [displayTrend]);

  const trendAverageY = useMemo(() => {
    const top = 14;
    const bottom = 76;
    const y = bottom - ((bottom - top) * trendAverage) / 100;
    return Math.min(72, Math.max(16, y));
  }, [trendAverage]);

  const resultPercent = useCallback(
    (count: number) => (totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0),
    [totalQuestions]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-3xl font-semibold leading-tight text-sky-700">
          {t(`assessment.reportBands.${reportBand}.title`)}
        </h2>
        <p className="max-w-3xl text-xl font-normal leading-8 text-sky-700">
          {t(`assessment.reportBands.${reportBand}.subtitle`)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-h-36 flex-col justify-center gap-2.5 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.metricAccuracy")}</p>
          <p className="text-4xl font-semibold text-sky-700">{accuracy}%</p>
        </div>
        <div className="flex min-h-36 flex-col justify-center gap-2.5 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.metricScore")}</p>
          <p className="flex items-end gap-2 text-sky-700">
            <span className="text-4xl font-semibold leading-none">{correctCount}</span>
            <span className="text-2xl font-normal leading-none">/{totalQuestions}</span>
          </p>
        </div>
        <div className="flex min-h-36 flex-col justify-center gap-2.5 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.metricDuration")}</p>
          <p className="text-4xl font-semibold text-sky-700">{formatDuration(durationSeconds)}</p>
        </div>
        <div className="flex min-h-36 flex-col justify-center gap-2.5 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.metricAttempt")}</p>
          <p className="text-4xl font-semibold text-sky-700">{attemptNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-h-96 flex-col gap-2.5 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.trendTitle")}</p>
          {displayTrend.length <= 1 && (
            <p className="text-xs text-sky-700/60">{t("assessment.trendNeedMoreData")}</p>
          )}
          <div className="relative min-h-72 flex-1 overflow-hidden rounded-2xl bg-white px-2 pb-10 pt-6">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-2 top-6 h-[calc(100%-4rem)] w-[calc(100%-1rem)]">
              <line x1="8" y1="14" x2="96" y2="14" stroke="rgba(3,105,161,0.10)" strokeWidth="0.8" />
              <line x1="8" y1="45" x2="96" y2="45" stroke="rgba(3,105,161,0.10)" strokeWidth="0.8" />
              <line x1="8" y1="76" x2="96" y2="76" stroke="rgba(3,105,161,0.14)" strokeWidth="0.9" />
              {trendChart.polyline && (
                <polyline points={trendChart.polyline} fill="none" stroke="#ef4444" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round" />
              )}
            </svg>
            <div className="absolute inset-x-2 top-6 h-[calc(100%-4rem)]">
              <p
                className="absolute right-5 -translate-y-1/2 text-sm font-normal leading-7 text-zinc-800"
                style={{ top: `${trendAverageY}%` }}
              >
                {t("assessment.trendAverage", { value: trendAverage })}
              </p>
              {trendChart.dots.map((dot) => (
                <div key={`${dot.x}-${dot.y}`} className="absolute" style={{ left: `${dot.x}%`, top: `${dot.y}%` }}>
                  <span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] whitespace-nowrap text-xs font-normal text-zinc-800">
                    {dot.accuracy}%
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-2 bottom-2 h-8 text-xs text-zinc-800">
              {trendChart.ticks.map((tick) => (
                <span
                  key={`${tick.x}-${tick.label}`}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${tick.x}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-96 flex-col gap-4 rounded-2xl border border-sky-700/10 bg-white p-6 md:p-8">
          <p className="text-base font-medium leading-7 text-sky-700">{t("assessment.resultBreakdown")}</p>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative h-40 w-40 rounded-full" style={{ background: donutGradient }}>
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1 text-base font-medium leading-7 text-sky-700">
            <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3">
              <span className="size-4 rounded-full bg-[#4ADE80]" />
              <span>{t("assessment.correct")}</span>
              <span>{correctCount} ({resultPercent(correctCount)}%)</span>
            </div>
            <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3">
              <span className="size-4 rounded-full bg-[#E45C44]" />
              <span>{t("assessment.incorrect")}</span>
              <span>{incorrectCount} ({resultPercent(incorrectCount)}%)</span>
            </div>
            <div className="grid grid-cols-[1rem_1fr_auto] items-center gap-3">
              <span className="size-4 rounded-full bg-[#FFB423]" />
              <span>{t("assessment.timeout")}</span>
              <span>{timeoutCount} ({resultPercent(timeoutCount)}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <p className="text-xl font-semibold leading-5 text-sky-700">{t("assessment.performance")}</p>
            <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5">
              {(["all", "incorrect", "timeout", "correct", "topics"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnswerFilter(f)}
                  className={`h-12 rounded-2xl px-5 text-lg font-medium leading-5 transition ${
                    answerFilter === f
                      ? "bg-sky-700 text-white shadow-[0px_1.16px_3.48px_0px_rgba(0,0,0,0.10)]"
                      : "text-sky-700 hover:bg-indigo-50"
                  }`}
                >
                  {t(`assessment.filter.${f}`)}
                </button>
              ))}
            </div>
          </div>
          {answerFilter !== "topics" && (
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setAnswerPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label={t("assessment.prevPage")}
                className="flex size-6 items-center justify-center text-sky-700 transition hover:opacity-80 disabled:opacity-40"
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d={QUESTION_GRID_PREV_PATH} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-base font-medium leading-5 text-sky-700">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-white">{safePage}</span>
                <span>/ {totalPages}</span>
              </div>
              <button
                type="button"
                onClick={() => setAnswerPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label={t("assessment.nextPage")}
                className="flex size-6 items-center justify-center text-sky-700 transition hover:opacity-80 disabled:opacity-40"
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d={QUESTION_GRID_NEXT_PATH} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {answerFilter === "topics" ? (
          <div className="flex flex-col gap-4">
            {categoryStats.length > 0 ? (
              categoryStats.map((row) => {
                const total = row.topics.reduce((sum, topic) => sum + topic.total, 0);
                const correct = row.topics.reduce((sum, topic) => sum + topic.correct, 0);
                const statusClass =
                  row.accuracy >= 80 ? "bg-green-400" : row.accuracy >= 60 ? "bg-amber-400" : "bg-red-500";
                return (
                  <div key={row.category} className="rounded-2xl bg-white/80 p-6">
                    <div className="flex items-start gap-5">
                      <span className={`mt-0.5 size-6 shrink-0 rounded-full ${statusClass}`} />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setExpandedCategories((prev) => ({ ...prev, [row.category]: !prev[row.category] }))}
                          className="flex w-full items-center justify-between gap-4 text-left"
                        >
                          <span className="text-lg font-medium leading-6 text-zinc-800">
                            {categoryLabel(row.category)}
                          </span>
                          <span className="shrink-0 text-base font-medium leading-5 text-sky-700">
                            {expandedCategories[row.category] ? t("assessment.collapse") : t("assessment.expand")}
                          </span>
                        </button>
                        <p className="mt-2 text-base leading-5 text-sky-700">
                          <span className="font-medium">{t("assessment.metricAccuracy")}</span>
                          <span className="font-normal">: {row.accuracy}% &bull; </span>
                          <span className="font-medium">{t("assessment.correct")}</span>
                          <span className="font-normal">: {correct}/{total} &bull; </span>
                          <span className="font-medium">{t("assessment.filter.topics")}</span>
                          <span className="font-normal">: {row.topics.length}</span>
                        </p>
                        {expandedCategories[row.category] && (
                          <div className="mt-4 flex flex-col gap-3">
                            {row.topics.map((topic) => (
                              <div key={topic.topic_key} className="rounded-2xl bg-indigo-50 px-5 py-4">
                                <p className="text-base font-medium leading-5 text-zinc-800">{topicLabel(topic.topic_key)}</p>
                                <p className="mt-2 text-sm leading-5 text-sky-700">
                                  <span className="font-medium">{t("assessment.metricAccuracy")}</span>
                                  <span className="font-normal">: {topic.accuracy}% &bull; </span>
                                  <span className="font-medium">{t("assessment.correct")}</span>
                                  <span className="font-normal">: {topic.correct}/{topic.total}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-white/80 p-6">
                <p className="text-sm text-sky-700/70">{t("assessment.noData")}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pageRows.map((row, i) => {
              const questionNumber = (safePage - 1) * pageSize + i + 1;
              const statusClass = row.is_timeout ? "bg-amber-400" : row.is_correct ? "bg-green-400" : "bg-red-500";
              return (
                <div key={`${row.topic_key}-${questionNumber}-${row.question_text}`} className="rounded-2xl bg-white/80 p-6">
                  <div className="flex items-start gap-5">
                    <span className={`mt-0.5 size-6 shrink-0 rounded-full ${statusClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg leading-6 text-zinc-800">
                        <span className="font-medium">Q{questionNumber}:</span>{" "}
                        <span className="font-normal">{row.question_text}</span>
                      </p>
                      <p className="mt-2 text-base leading-5 text-sky-700">
                        <span className="font-medium">{t("assessment.tableYourAnswer")}</span>
                        <span className="font-normal">: {row.user_answer ?? "-"} &bull; </span>
                        <span className="font-medium">{t("assessment.tableCorrectAnswer")}</span>
                        <span className="font-normal">: {row.correct_answer ?? "-"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-indigo-50 px-6 py-4 text-base font-medium leading-6 text-sky-700 transition hover:bg-indigo-100"
          >
            {t("assessment.testHistoryCta")}
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-[#E45C44] px-6 py-4 text-base font-medium leading-6 text-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg transition hover:opacity-95"
          >
            {t("assessment.retest")}
          </button>
        </div>
      </div>
    </div>
  );
}
