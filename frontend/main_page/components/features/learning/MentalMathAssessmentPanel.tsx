"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION, MENTAL_MATH_ASSESSMENT_TOPICS } from "@/config/mental-math-assessment";
import {
  createAssessmentSession,
  fetchAssessmentDetail,
  fetchAssessmentHistory,
  fetchAssessmentTrend,
  fetchCurrentUserProfile,
  type AssessmentAnswerPayload,
  type AssessmentSessionDetail,
  type AssessmentSessionSummary,
  type AssessmentTrendPoint,
} from "@/services/userApi";

type Phase = "intro" | "inProgress" | "result";
type Tab = "current" | "history";
type AnswerFilter = "all" | "incorrect" | "timeout" | "correct";
type TrendRange = "30n" | "100n" | "all";
type TrendHoverState = { point: { x: number; y: number; label: string; accuracy: number }; mouseX: number; mouseY: number } | null;

interface AssessmentQuestion {
  topicKey: string;
  expression: string;
  correctAnswer: number;
}

interface AssessmentRecord {
  question: AssessmentQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  isTimeout: boolean;
  timeSpentMs: number;
}

interface TopicStat {
  topic_key: string;
  total: number;
  correct: number;
  accuracy: number;
}

function calcExpression(expression: string): number {
  const normalized = expression.replace("= ?", "").replaceAll(" ", "").replaceAll("−", "-");
  const numbers = normalized.split(/[+-]/).map((x) => Number(x));
  const operators = normalized.match(/[+-]/g) ?? [];
  if (numbers.length === 0 || Number.isNaN(numbers[0])) {
    return 0;
  }
  return operators.reduce((acc, op, index) => {
    const next = numbers[index + 1];
    if (Number.isNaN(next)) {
      return acc;
    }
    return op === "+" ? acc + next : acc - next;
  }, numbers[0]);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "-";
  }
  return parseServerDate(iso).toLocaleString();
}

function formatTrendTick(iso: string): string {
  const d = parseServerDate(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function parseServerDate(iso: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

function mapRecordsToAnswers(records: AssessmentRecord[]): AssessmentAnswerPayload[] {
  return records.map((row) => ({
    topic_key: row.question.topicKey,
    question_text: row.question.expression,
    user_answer: row.userAnswer === null ? null : String(row.userAnswer),
    correct_answer: String(row.question.correctAnswer),
    is_correct: row.isCorrect,
    is_timeout: row.isTimeout,
    time_spent_ms: row.timeSpentMs,
  }));
}

function buildTopicStatsFromAnswers(answers: AssessmentAnswerPayload[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  answers.forEach((row) => {
    const found = map.get(row.topic_key);
    if (found) {
      found.total += 1;
      found.correct += row.is_correct ? 1 : 0;
      found.accuracy = found.total > 0 ? Math.round((found.correct / found.total) * 100) : 0;
    } else {
      map.set(row.topic_key, {
        topic_key: row.topic_key,
        total: 1,
        correct: row.is_correct ? 1 : 0,
        accuracy: row.is_correct ? 100 : 0,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.accuracy - a.accuracy);
}

export default function MentalMathAssessmentPanel() {
  const t = useTranslations("learning");
  const [tab, setTab] = useState<Tab>("current");
  const [phase, setPhase] = useState<Phase>("intro");
  const [username, setUsername] = useState("-");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [testStartedAt, setTestStartedAt] = useState<number | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<AssessmentSessionSummary[]>([]);
  const [trend, setTrend] = useState<AssessmentTrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("30n");
  const [trendHover, setTrendHover] = useState<TrendHoverState>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssessmentSessionDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");
  const [answerPage, setAnswerPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const submitLockRef = useRef(false);

  const availableTopicsCount = useMemo(
    () => MENTAL_MATH_ASSESSMENT_TOPICS.filter((topic) => topic.questions.length > 0).length,
    []
  );
  const currentQuestion = questions[currentIndex] ?? null;
  const canSubmit = /^-?\d+$/.test(answer.trim());

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [historyData, trendData] = await Promise.all([
        fetchAssessmentHistory("mental-math", 50, 0),
        fetchAssessmentTrend("mental-math", 100).catch(() => []),
      ]);
      setHistory(historyData.list);
      setTrend(trendData);

      const firstId = historyData.list[0]?.id ?? null;
      if (firstId !== null) {
        setSelectedSessionId((prev) => prev ?? firstId);
        const idToLoad = selectedSessionId ?? firstId;
        const loaded = await fetchAssessmentDetail(idToLoad);
        setDetail(loaded);
      } else {
        setDetail(null);
      }

    } catch {
      setHistory([]);
      setTrend([]);
      setDetail(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchCurrentUserProfile();
        setUsername(me.username || "-");
      } catch {}
      await loadHistory();
    })();
  }, [loadHistory]);

  const topicLabel = useCallback(
    (topicKey: string): string => {
      if (topicKey.startsWith("makingWhole.")) {
        const secret = topicKey.split(".")[1];
        return t(`makingWholeSecrets.${secret}`);
      }
      return t(`mentalMathCategories.${topicKey}`);
    },
    [t]
  );

  const startTest = () => {
    const set = MENTAL_MATH_ASSESSMENT_TOPICS.filter((topic) => topic.questions.length > 0).map((topic) => {
      const random = topic.questions[Math.floor(Math.random() * topic.questions.length)];
      return {
        topicKey: topic.id,
        expression: random.expression,
        correctAnswer: calcExpression(random.expression),
      };
    });
    if (set.length === 0) {
      return;
    }
    const now = Date.now();
    setQuestions(set);
    setRecords([]);
    setCurrentIndex(0);
    setAnswer("");
    setTestStartedAt(now);
    setQuestionStartedAt(now);
    setTimeLeftMs(MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000);
    setPhase("inProgress");
    setTab("current");
  };

  const finishTest = useCallback(
    async (nextRecords: AssessmentRecord[]) => {
      if (!testStartedAt) {
        return;
      }
      setSaving(true);
      const finishedAt = Date.now();
      const answers = mapRecordsToAnswers(nextRecords);
      const topicStats = buildTopicStatsFromAnswers(answers);
      const strongest = topicStats[0]?.topic_key ?? null;
      const weakest = [...topicStats].sort((a, b) => a.accuracy - b.accuracy)[0]?.topic_key ?? null;
      const correctCount = answers.filter((x) => x.is_correct).length;
      const total = answers.length;
      const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const created = await createAssessmentSession({
        subject: "mental-math",
        started_at: new Date(testStartedAt).toISOString(),
        finished_at: new Date(finishedAt).toISOString(),
        duration_seconds: Math.max(1, Math.round((finishedAt - testStartedAt) / 1000)),
        total_questions: total,
        correct_count: correctCount,
        accuracy,
        strongest_area: strongest,
        weakest_area: weakest,
        topic_stats: topicStats,
        answers,
      });
      await loadHistory();
      setSelectedSessionId(created.session_id);
      setDetail(await fetchAssessmentDetail(created.session_id));
      setSaving(false);
      setPhase("result");
      setTab("current");
    },
    [loadHistory, testStartedAt]
  );

  const submitAnswer = useCallback(
    (isTimeout: boolean) => {
      if (submitLockRef.current || phase !== "inProgress" || !currentQuestion || questionStartedAt === null) {
        return;
      }
      submitLockRef.current = true;
      const now = Date.now();
      const elapsed = Math.max(0, Math.min(now - questionStartedAt, MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000));
      const parsed = isTimeout ? null : Number(answer.trim());
      const row: AssessmentRecord = {
        question: currentQuestion,
        userAnswer: parsed,
        isCorrect: !isTimeout && parsed === currentQuestion.correctAnswer,
        isTimeout,
        timeSpentMs: elapsed,
      };
      const next = [...records, row];
      if (currentIndex >= questions.length - 1) {
        void finishTest(next);
      } else {
        setRecords(next);
        setCurrentIndex((index) => index + 1);
        setAnswer("");
        setQuestionStartedAt(Date.now());
        setTimeLeftMs(MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000);
      }
      submitLockRef.current = false;
    },
    [answer, currentIndex, currentQuestion, finishTest, phase, questionStartedAt, questions.length, records]
  );

  useEffect(() => {
    if (phase !== "inProgress" || questionStartedAt === null || !currentQuestion) {
      return;
    }
    const interval = window.setInterval(() => {
      setTimeLeftMs(
        Math.max(0, MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000 - (Date.now() - questionStartedAt))
      );
    }, 100);
    const timeout = window.setTimeout(
      () => submitAnswer(true),
      Math.max(0, MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION * 1000 - (Date.now() - questionStartedAt))
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [currentQuestion, phase, questionStartedAt, submitAnswer]);

  const displayTopicStats: TopicStat[] = useMemo(() => {
    if (!detail) return [];
    return detail.topic_stats as TopicStat[];
  }, [detail]);

  const answers = detail?.answers ?? [];
  const accuracy = detail?.accuracy ?? 0;
  const correctCount = detail?.correct_count ?? 0;
  const totalQuestions = detail?.total_questions ?? 0;
  const timeoutCount = answers.filter((x) => x.is_timeout).length;
  const incorrectCount = totalQuestions - correctCount - timeoutCount;

  const categoryStats = useMemo(() => {
    const map = new Map<string, { accuracy: number; topics: TopicStat[] }>();
    displayTopicStats.forEach((topic) => {
      const category = topic.topic_key.split(".")[0];
      const found = map.get(category);
      if (found) {
        found.topics.push(topic);
        found.accuracy = Math.round(
          found.topics.reduce((sum, row) => sum + row.accuracy, 0) / Math.max(1, found.topics.length)
        );
      } else {
        map.set(category, { accuracy: topic.accuracy, topics: [topic] });
      }
    });
    return Array.from(map.entries()).map(([category, data]) => ({ category, ...data }));
  }, [displayTopicStats]);

  const filteredAnswers = useMemo(() => {
    if (answerFilter === "all") return answers;
    if (answerFilter === "timeout") return answers.filter((x) => x.is_timeout);
    if (answerFilter === "correct") return answers.filter((x) => x.is_correct);
    return answers.filter((x) => !x.is_correct && !x.is_timeout);
  }, [answerFilter, answers]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAnswers.length / pageSize));
  const safePage = Math.min(answerPage, totalPages);
  const pageRows = filteredAnswers.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    setAnswerPage(1);
  }, [answerFilter]);

  const displayTrend = useMemo(() => {
    if (trend.length === 0) return [] as AssessmentTrendPoint[];
    if (trendRange === "30n") return trend.slice(-30);
    if (trendRange === "100n") return trend.slice(-100);
    return trend;
  }, [trend, trendRange]);

  const trendChart = useMemo(() => {
    if (displayTrend.length < 2) {
      return { polyline: "", dots: [] as Array<{ x: number; y: number; label: string; accuracy: number }>, ticks: [] as Array<{ x: number; label: string }> };
    }
    const left = 10;
    const right = 96;
    const top = 8;
    const bottom = 88;
    const times = displayTrend.map((p) => parseServerDate(p.finished_at).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(1, maxT - minT);
    const dots = displayTrend.map((point, index) => {
      const ratioX = (times[index] - minT) / span;
      const x = left + (right - left) * ratioX;
      const y = bottom - ((bottom - top) * point.accuracy) / 100;
      return { x, y, label: formatTrendTick(point.finished_at), accuracy: point.accuracy };
    });
    const polyline = dots.map((p) => `${p.x},${p.y}`).join(" ");
    const tickIndexes = Array.from(new Set([0, Math.floor((displayTrend.length - 1) / 2), displayTrend.length - 1]));
    const ticks = tickIndexes.map((i) => ({ x: dots[i].x, label: dots[i].label }));
    return { polyline, dots, ticks };
  }, [displayTrend]);

  const handleTrendMouseMove = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      if (trendChart.dots.length === 0) {
        setTrendHover(null);
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const xInViewBox = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const yInViewBox = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      const nearest = trendChart.dots.reduce((best, cur) =>
        Math.abs(cur.x - xInViewBox) < Math.abs(best.x - xInViewBox) ? cur : best
      );
      setTrendHover({ point: nearest, mouseX: xInViewBox, mouseY: yInViewBox });
    },
    [trendChart.dots]
  );

  useEffect(() => {
    setTrendHover(null);
  }, [trendRange, detail?.id]);

  const donutGradient = useMemo(() => {
    const total = totalQuestions || 1;
    const c = Math.round((correctCount / total) * 100);
    const i = Math.round((incorrectCount / total) * 100);
    return `conic-gradient(#16a34a 0 ${c}%, #ef4444 ${c}% ${c + i}%, #f59e0b ${c + i}% 100%)`;
  }, [correctCount, incorrectCount, totalQuestions]);

  const detailDashboard = detail ? (
    <div className="rounded-xl bg-white p-4">
      <p className="text-sm text-gray-700">{t("assessment.subject")}</p>
      <p className="text-sm text-gray-700">{t("assessment.reportUsername", { username })}</p>
      <p className="text-sm text-gray-700">{t("assessment.reportStartedAt", { time: formatDateTime(detail.started_at) })}</p>
      <p className="text-sm text-gray-700">{t("assessment.reportFinishedAt", { time: formatDateTime(detail.finished_at) })}</p>

      {trend.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-gray-900">{t("assessment.trendTitle")}</p>
            <div className="inline-flex rounded border border-gray-200 bg-white p-1 text-xs">
              <button type="button" onClick={() => setTrendRange("30n")} className={`rounded px-2 py-1 ${trendRange === "30n" ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t("assessment.trendRange30n")}</button>
              <button type="button" onClick={() => setTrendRange("100n")} className={`rounded px-2 py-1 ${trendRange === "100n" ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t("assessment.trendRange100n")}</button>
              <button type="button" onClick={() => setTrendRange("all")} className={`rounded px-2 py-1 ${trendRange === "all" ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t("assessment.trendRangeAll")}</button>
            </div>
          </div>
          {displayTrend.length < trend.length && <p className="mt-1 text-xs text-gray-500">{t("assessment.trendTruncatedHint", { count: displayTrend.length })}</p>}
          {displayTrend.length <= 1 && <p className="mt-1 text-xs text-gray-500">{t("assessment.trendNeedMoreData")}</p>}
          <div className="relative mt-2 rounded bg-white p-2">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-36 w-full">
              <line x1="10" y1="8" x2="96" y2="8" stroke="#eef2ff" strokeWidth="0.8" />
              <line x1="10" y1="48" x2="96" y2="48" stroke="#eef2ff" strokeWidth="0.8" />
              <line x1="10" y1="88" x2="96" y2="88" stroke="#e2e8f0" strokeWidth="0.9" />

              <polyline points={trendChart.polyline} fill="none" stroke="#2563eb" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
              <rect
                x="10"
                y="8"
                width="86"
                height="80"
                fill="transparent"
                onMouseMove={handleTrendMouseMove}
                onMouseLeave={() => setTrendHover(null)}
              />
            </svg>
            {trendHover && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded bg-gray-900 px-2 py-1 text-xs text-white"
                style={{ left: `${trendHover.mouseX}%`, top: `${Math.max(8, trendHover.mouseY - 4)}%` }}
              >
                Accuracy: {trendHover.point.accuracy}%
              </div>
            )}
            <div className="relative mt-1 h-4 text-xs text-gray-500">
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
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t("assessment.metricAccuracy")}</p><p className="text-xl font-semibold text-gray-900">{accuracy}%</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t("assessment.metricScore")}</p><p className="text-xl font-semibold text-gray-900">{correctCount}/{totalQuestions}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t("assessment.metricDuration")}</p><p className="text-xl font-semibold text-gray-900">{formatDuration(detail.duration_seconds)}</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{t("assessment.metricQuestions")}</p><p className="text-xl font-semibold text-gray-900">{totalQuestions}</p></div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3 xl:col-span-2">
          <p className="font-semibold text-gray-900">{t("assessment.topicPerformance")}</p>
          <div className="mt-3 space-y-2">
            {categoryStats.map((row) => (
              <div key={row.category} className="rounded-md bg-white p-2">
                <button type="button" onClick={() => setExpandedCategories((prev) => ({ ...prev, [row.category]: !prev[row.category] }))} className="mb-1 flex w-full items-center justify-between text-sm text-gray-700">
                  <span>{t(`mentalMathCategories.${row.category}`)} ({row.topics.length})</span>
                  <span>{expandedCategories[row.category] ? t("assessment.collapse") : t("assessment.expand")}</span>
                </button>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-blue-600" style={{ width: `${row.accuracy}%` }} /></div>
                {expandedCategories[row.category] && <div className="mt-2 space-y-1 text-xs text-gray-600">{row.topics.map((x) => <p key={x.topic_key}>{topicLabel(x.topic_key)}: {x.accuracy}%</p>)}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="font-semibold text-gray-900">{t("assessment.resultBreakdown")}</p>
          <div className="mt-3 flex justify-center">
            <div className="relative h-28 w-28 rounded-full" style={{ background: donutGradient }}>
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-gray-700">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                {t("assessment.correct")}
              </span>
              <span>
                {correctCount} ({totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {t("assessment.incorrect")}
              </span>
              <span>
                {Math.max(0, incorrectCount)} ({totalQuestions > 0 ? Math.round((Math.max(0, incorrectCount) / totalQuestions) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {t("assessment.timeout")}
              </span>
              <span>
                {timeoutCount} ({totalQuestions > 0 ? Math.round((timeoutCount / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-gray-900">{t("assessment.answerReview")}</p>
          <div className="inline-flex rounded border border-gray-200 bg-white p-1 text-xs">
            {(["all", "incorrect", "timeout", "correct"] as const).map((f) => <button key={f} type="button" onClick={() => setAnswerFilter(f)} className={`rounded px-2 py-1 ${answerFilter === f ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t(`assessment.filter.${f}`)}</button>)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white text-left text-gray-600"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">{t("assessment.tableQuestion")}</th><th className="px-3 py-2">{t("assessment.tableYourAnswer")}</th><th className="px-3 py-2">{t("assessment.tableCorrectAnswer")}</th><th className="px-3 py-2">{t("assessment.tableResult")}</th></tr></thead>
            <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
              {pageRows.map((row, i) => {
                const res = row.is_timeout ? t("assessment.timeout") : row.is_correct ? t("assessment.correct") : t("assessment.incorrect");
                return <tr key={`${row.topic_key}-${i}-${row.question_text}`}><td className="px-3 py-2">{(safePage - 1) * pageSize + i + 1}</td><td className="px-3 py-2">{row.question_text}</td><td className="px-3 py-2">{row.user_answer ?? "-"}</td><td className="px-3 py-2">{row.correct_answer ?? "-"}</td><td className="px-3 py-2">{res}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
          <span>{t("assessment.pageInfo", { current: safePage, total: totalPages })}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAnswerPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">{t("assessment.prevPage")}</button>
            <button type="button" onClick={() => setAnswerPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40">{t("assessment.nextPage")}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="rounded-xl bg-gray-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xl font-semibold text-gray-800">{t("assessment.title")}</h4>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
          <button type="button" onClick={() => setTab("current")} className={`rounded px-3 py-1.5 ${tab === "current" ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t("assessment.tabCurrent")}</button>
          <button type="button" onClick={() => setTab("history")} className={`rounded px-3 py-1.5 ${tab === "history" ? "bg-blue-600 text-white" : "text-gray-600"}`}>{t("assessment.tabHistory")}</button>
        </div>
      </div>

      {tab === "current" && phase === "intro" && (
        <div>
          <p className="text-gray-700">{t("assessment.subject")}</p>
          <p className="mt-1 text-gray-700">{t("assessment.rules", { seconds: MENTAL_MATH_ASSESSMENT_SECONDS_PER_QUESTION, count: availableTopicsCount })}</p>
          <button type="button" onClick={startTest} disabled={availableTopicsCount === 0} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-300">{t("assessment.start")}</button>
        </div>
      )}

      {tab === "current" && phase === "inProgress" && currentQuestion && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{t("assessment.progress", { current: currentIndex + 1, total: questions.length })}</p>
            <p className="rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-600">{t("assessment.timer", { seconds: Math.max(0, Math.ceil(timeLeftMs / 1000)) })}</p>
          </div>
          <h4 className="mt-3 text-2xl font-semibold text-gray-800">{currentQuestion.expression}</h4>
          <div className="mt-4 flex flex-col gap-3 sm:max-w-xs">
            <input type="text" inputMode="numeric" value={answer} onChange={(e) => (/^-?\d*$/.test(e.target.value.trim()) ? setAnswer(e.target.value.trim()) : null)} onKeyDown={(e) => (e.key === "Enter" && canSubmit ? submitAnswer(false) : null)} placeholder={t("assessment.answerPlaceholder")} className="rounded-lg border border-gray-300 bg-white px-3 py-2" />
            <button type="button" onClick={() => submitAnswer(false)} disabled={!canSubmit} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-300">{t("assessment.submit")}</button>
          </div>
        </div>
      )}

      {tab === "current" && phase === "result" && (
        <div className="space-y-4">
          {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
          {detailDashboard}
          <div className="flex gap-2">
            <button type="button" onClick={startTest} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
              {t("assessment.retest")}
            </button>
            <button type="button" onClick={() => setTab("history")} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700">
              {t("assessment.tabHistory")}
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
          {historyLoading && <p className="text-sm text-gray-500">{t("assessment.historyLoading")}</p>}
          {!historyLoading && history.length === 0 && <p className="text-sm text-gray-500">{t("assessment.historyEmpty")}</p>}

          {history.length > 0 && (
            <div className="rounded-xl bg-white p-4">
              <p className="font-semibold text-gray-900">{t("assessment.historyList")}</p>
              <select
                value={selectedSessionId ?? ""}
                onChange={async (e) => {
                  const id = Number(e.target.value);
                  if (!id) return;
                  setSelectedSessionId(id);
                  setDetail(await fetchAssessmentDetail(id));
                }}
                className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">{t("assessment.historySelectPlaceholder")}</option>
                {history.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatDateTime(session.finished_at)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {detailDashboard}
        </div>
      )}
    </div>
  );
}
