"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import {
  MENTAL_MATH_ASSESSMENT_TOPICS,
  MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES,
  MENTAL_MATH_ASSESSMENT_TOTAL_MS,
} from "@/config/mental-math-assessment";
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

/** Intro copy uses same total duration as in-progress countdown (config). */
const ASSESSMENT_INTRO_DISPLAY_MS = MENTAL_MATH_ASSESSMENT_TOTAL_MS;

/** Paths match public/learning/previous.svg and next.svg; stroke uses currentColor for enabled/disabled tint. */
const QUESTION_GRID_PREV_PATH =
  "M16 12H8M12 16L8 12L12 8M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z";
const QUESTION_GRID_NEXT_PATH =
  "M8 12H16M12 16L16 12L12 8M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z";

/** Right-panel question map: design is 4 rows × 5 pills per page. */
const SIDE_QUESTION_PILL_PAGE_SIZE = 20;

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

/** HH:MM:SS for countdown display (ceil to whole seconds). */
function formatHhMmSsFromMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

/** Integer answer only (leading minus allowed). */
function parseFillInInteger(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || !/^-?\d+$/.test(t)) {
    return null;
  }
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

function questionExprForDisplay(expression: string): string {
  return expression.replace(/\s*=\s*\?+\s*$/u, "").trim();
}

export default function MentalMathAssessmentPanel() {
  const t = useTranslations("learning");
  const [tab, setTab] = useState<Tab>("current");
  const [phase, setPhase] = useState<Phase>("intro");
  const [username, setUsername] = useState("-");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [testStartedAt, setTestStartedAt] = useState<number | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(MENTAL_MATH_ASSESSMENT_TOTAL_MS);
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
  const [sideQuestionPillPage, setSideQuestionPillPage] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const submitLockRef = useRef(false);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const latestGlobalTimerRef = useRef<{
    phase: Phase;
    records: AssessmentRecord[];
    currentIndex: number;
    currentQuestion: AssessmentQuestion | null;
    questions: AssessmentQuestion[];
    questionStartedAt: number | null;
    finishTest: (nextRecords: AssessmentRecord[]) => Promise<void>;
  }>({
    phase: "intro",
    records: [],
    currentIndex: 0,
    currentQuestion: null,
    questions: [],
    questionStartedAt: null,
    finishTest: async () => {},
  });

  const availableTopicsCount = useMemo(
    () => MENTAL_MATH_ASSESSMENT_TOPICS.filter((topic) => topic.questions.length > 0).length,
    []
  );
  const currentQuestion = questions[currentIndex] ?? null;
  const parsedFillIn = parseFillInInteger(answerInput);
  const canSubmit = parsedFillIn !== null;

  const questionPillCount = phase === "inProgress" ? questions.length : availableTopicsCount;

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

  useEffect(() => {
    const total = Math.max(1, Math.ceil(questionPillCount / SIDE_QUESTION_PILL_PAGE_SIZE));
    setSideQuestionPillPage((p) => Math.min(p, total));
  }, [questionPillCount]);

  useEffect(() => {
    if (testStartedAt !== null) {
      setSideQuestionPillPage(1);
    }
  }, [testStartedAt]);

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
    setAnswerInput("");
    setTestStartedAt(now);
    setQuestionStartedAt(now);
    setTimeLeftMs(MENTAL_MATH_ASSESSMENT_TOTAL_MS);
    setPhase("inProgress");
    setTab("current");
  };

  const quitTest = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(t("assessment.quitConfirm"))) {
      return;
    }
    setPhase("intro");
    setQuestions([]);
    setRecords([]);
    setCurrentIndex(0);
    setAnswerInput("");
    setTestStartedAt(null);
    setQuestionStartedAt(null);
    setTimeLeftMs(MENTAL_MATH_ASSESSMENT_TOTAL_MS);
    setTab("current");
  }, [t]);

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
      const elapsed = Math.max(0, now - questionStartedAt);
      const parsed = isTimeout ? null : parseFillInInteger(answerInput);
      const row: AssessmentRecord = {
        question: currentQuestion,
        userAnswer: parsed,
        isCorrect: !isTimeout && parsed !== null && parsed === currentQuestion.correctAnswer,
        isTimeout,
        timeSpentMs: elapsed,
      };
      const next = [...records, row];
      if (currentIndex >= questions.length - 1) {
        void finishTest(next);
      } else {
        setRecords(next);
        setCurrentIndex((index) => index + 1);
        setAnswerInput("");
        setQuestionStartedAt(Date.now());
      }
      submitLockRef.current = false;
    },
    [answerInput, currentIndex, currentQuestion, finishTest, phase, questionStartedAt, questions.length, records]
  );

  const goPreviousQuestion = useCallback(() => {
    if (currentIndex <= 0 || phase !== "inProgress") {
      return;
    }
    const last = records[records.length - 1];
    setRecords((prev) => prev.slice(0, -1));
    setCurrentIndex((i) => i - 1);
    setAnswerInput(last?.userAnswer !== null && last?.userAnswer !== undefined ? String(last.userAnswer) : "");
    setQuestionStartedAt(Date.now());
  }, [currentIndex, phase, records]);

  latestGlobalTimerRef.current = {
    phase,
    records,
    currentIndex,
    currentQuestion,
    questions,
    questionStartedAt,
    finishTest,
  };

  useEffect(() => {
    if (phase !== "inProgress" || testStartedAt === null) {
      return;
    }
    const totalMs = MENTAL_MATH_ASSESSMENT_TOTAL_MS;
    let globalTimeoutFired = false;
    const tick = () => {
      const left = Math.max(0, testStartedAt + totalMs - Date.now());
      setTimeLeftMs(left);
      if (left > 0 || globalTimeoutFired) {
        return;
      }
      const snap = latestGlobalTimerRef.current;
      if (snap.phase !== "inProgress" || snap.currentQuestion === null || submitLockRef.current) {
        return;
      }
      globalTimeoutFired = true;
      submitLockRef.current = true;
      void (async () => {
        try {
          const cq = snap.currentQuestion;
          if (!cq) {
            return;
          }
          const now = Date.now();
          let next = [...snap.records];
          const elapsed =
            snap.questionStartedAt !== null ? Math.max(0, now - snap.questionStartedAt) : 0;
          next.push({
            question: cq,
            userAnswer: null,
            isCorrect: false,
            isTimeout: true,
            timeSpentMs: elapsed,
          });
          for (let j = snap.currentIndex + 1; j < snap.questions.length; j++) {
            next.push({
              question: snap.questions[j]!,
              userAnswer: null,
              isCorrect: false,
              isTimeout: true,
              timeSpentMs: 0,
            });
          }
          await snap.finishTest(next);
        } finally {
          submitLockRef.current = false;
        }
      })();
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [phase, testStartedAt]);

  useEffect(() => {
    if (phase !== "inProgress" || !currentQuestion) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      answerInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase, currentIndex, currentQuestion]);

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

  const showAssessmentSidePanel = tab === "current" && (phase === "intro" || phase === "inProgress");
  /** Stroke stays inside viewBox: r + stroke/2 <= 60 (padding for round caps). */
  const ringR = 52;
  const ringStroke = 10;
  const ringCirc = 2 * Math.PI * ringR;
  const assessmentTotalMs = MENTAL_MATH_ASSESSMENT_TOTAL_MS;
  const ringRemainingRatio =
    phase === "inProgress" ? Math.min(1, Math.max(0, timeLeftMs / assessmentTotalMs)) : 1;
  const ringDashOffset = ringCirc * (1 - ringRemainingRatio);
  const pillNumbers = Array.from({ length: questionPillCount }, (_, i) => i + 1);
  const totalSidePillPages = Math.max(1, Math.ceil(questionPillCount / SIDE_QUESTION_PILL_PAGE_SIZE));
  const safeSidePillPage = Math.min(sideQuestionPillPage, totalSidePillPages);
  const pillPageSliceStart = (safeSidePillPage - 1) * SIDE_QUESTION_PILL_PAGE_SIZE;
  const pillPageSlice = pillNumbers.slice(pillPageSliceStart, pillPageSliceStart + SIDE_QUESTION_PILL_PAGE_SIZE);
  const pillRowsForPage: number[][] = [];
  for (let i = 0; i < pillPageSlice.length; i += 5) {
    pillRowsForPage.push(pillPageSlice.slice(i, i + 5));
  }
  const sideTimerDisplayMs = phase === "inProgress" ? timeLeftMs : ASSESSMENT_INTRO_DISPLAY_MS;

  const assessmentHeader = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 self-stretch">
      <div className="flex items-center gap-4 py-px">
        <button
          type="button"
          onClick={() => setTab("current")}
          className={`rounded-2xl py-3 text-left text-2xl font-semibold leading-none transition ${
            tab === "current" ? "text-sky-700" : "text-sky-700/50 hover:text-sky-700"
          }`}
        >
          {t("assessment.overviewTitle")}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setTab("history")}
        className={`rounded-2xl bg-indigo-50 px-8 py-4 text-lg font-medium leading-7 text-sky-700 transition hover:bg-indigo-100 ${
          tab === "history" ? "ring-2 ring-sky-600/40" : ""
        }`}
      >
        {t("assessment.testHistoryCta")}
      </button>
    </div>
  );

  const questionPillRows = (
    <div className="flex w-96 max-w-full flex-col gap-6">
      <div className="flex h-10 w-full items-center justify-between py-px">
        <h3 className="rounded-2xl py-3 text-xl font-semibold leading-none text-sky-700">
          {t("assessment.questionsHeading")}
        </h3>
        <div className="flex items-center gap-6">
          <button
            type="button"
            aria-label={t("assessment.questionGridPrevPage")}
            disabled={safeSidePillPage <= 1}
            onClick={() => setSideQuestionPillPage((p) => Math.max(1, p - 1))}
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#045E96] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:text-[#045E9666] disabled:hover:opacity-100"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="size-6 shrink-0" aria-hidden>
              <path
                d={QUESTION_GRID_PREV_PATH}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t("assessment.questionGridNextPage")}
            disabled={safeSidePillPage >= totalSidePillPages}
            onClick={() => setSideQuestionPillPage((p) => Math.min(totalSidePillPages, p + 1))}
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#045E96] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:text-[#045E9666] disabled:hover:opacity-100"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="size-6 shrink-0" aria-hidden>
              <path
                d={QUESTION_GRID_NEXT_PATH}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {pillRowsForPage.map((row, rowIdx) => (
        <div key={`${safeSidePillPage}-${rowIdx}`} className="flex h-12 w-full items-center justify-between gap-1.5">
          {row.map((num) => (
            <div
              key={num}
              className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 px-5 py-3 text-center text-base font-normal leading-5 text-sky-700 ${
                phase === "inProgress" && num === currentIndex + 1 ? "ring-2 ring-red-500/50" : ""
              }`}
            >
              {t("assessment.questionPill", { num })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const sidePanel = showAssessmentSidePanel ? (
    <aside className="relative flex w-full shrink-0 flex-col overflow-visible rounded-[32px] border border-white/60 bg-white/60 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60 xl:w-[459px]">
      <div className="flex shrink-0 flex-col items-center overflow-visible px-6 pt-14">
        <div className="relative mx-auto mt-4 shrink-0 overflow-visible">
          <svg
            width={240}
            height={240}
            viewBox="0 0 120 120"
            className="block -rotate-90 overflow-visible"
            aria-hidden
          >
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke="rgba(228, 92, 68, 0.3)"
              strokeWidth={ringStroke}
            />
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke="#E45C44"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringDashOffset}
              className="transition-[stroke-dashoffset] duration-100 ease-linear"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-base font-normal leading-5 text-sky-700">{t("assessment.timeRemaining")}</p>
            <p className="mt-1 text-4xl font-normal tabular-nums leading-none text-zinc-800">
              {formatHhMmSsFromMs(sideTimerDisplayMs)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 justify-center px-8 pb-8 pt-6">{questionPillRows}</div>
    </aside>
  ) : null;

  const mainCardClass =
    "flex min-w-0 flex-col gap-5 rounded-[32px] border border-white/60 bg-white/60 p-8 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60 " +
    (showAssessmentSidePanel ? "self-start flex-1 xl:max-w-[1094px]" : "w-full self-stretch");

  const showInProgressFillIn = tab === "current" && phase === "inProgress" && currentQuestion;

  return (
    <div
      className={
        showAssessmentSidePanel
          ? "flex flex-col gap-5 font-app-body xl:flex-row xl:items-start xl:gap-5"
          : "font-app-body"
      }
    >
      <div className={mainCardClass}>
        {!showInProgressFillIn ? assessmentHeader : null}

        {tab === "current" && phase === "intro" && (
          <div className="flex flex-col gap-5 self-stretch">
            <div className="flex flex-col gap-6 self-stretch rounded-2xl bg-white/90 p-12">
              <div className="flex flex-col gap-2.5 self-stretch">
                <h3 className="text-2xl font-medium leading-none text-sky-700">{t("assessment.introHeadline")}</h3>
              </div>
              <div className="flex flex-col gap-6 self-stretch text-sky-700">
                <p className="text-xl font-normal leading-8">{t("assessment.introLead")}</p>
                <p className="text-xl font-semibold leading-8">
                  {t("assessment.introStatsLine1", { minutes: MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES })}
                  <br />
                  {t("assessment.introStatsLine2", { count: availableTopicsCount })}
                </p>
                <p className="text-xl leading-8">
                  <span className="font-semibold">{t("assessment.introRememberBold")}</span>{" "}
                  <span className="font-normal">{t("assessment.introRememberRest")}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={startTest}
              disabled={availableTopicsCount === 0}
              className="flex h-14 w-full shrink-0 items-center justify-center self-stretch rounded-2xl bg-[#E45C44] text-lg font-medium leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
            >
              {t("assessment.readyToGo")}
            </button>
          </div>
        )}

        {showInProgressFillIn ? (
          <div className="flex flex-col gap-6 self-stretch">
            <div className="inline-flex h-14 w-full items-center justify-between self-stretch">
              <div className="flex items-center gap-4 py-px">
                <div className="flex items-center justify-center gap-2.5 rounded-2xl py-3">
                  <span className="text-lg font-semibold leading-5 text-sky-700">{t("assessment.inProgressTitle")}</span>
                </div>
                <div className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-indigo-50 px-5 py-3">
                  <span className="text-lg font-normal leading-5 text-sky-700">
                    {t("assessment.questionCountPill", { current: currentIndex + 1, total: questions.length })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={quitTest}
                className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 px-5 py-3 text-lg font-normal leading-5 text-sky-700 transition hover:bg-indigo-100"
              >
                {t("assessment.quitTest")}
              </button>
            </div>

            <div className="flex flex-col items-center justify-start gap-2.5 self-stretch rounded-2xl bg-white/90 px-12 py-11">
              <div className="inline-flex flex-wrap items-end justify-center gap-3">
                <span className="text-3xl font-medium leading-9 text-sky-700">
                  {questionExprForDisplay(currentQuestion.expression)} ={" "}
                </span>
                <input
                  ref={answerInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={t("assessment.answerPlaceholder")}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      e.preventDefault();
                      submitAnswer(false);
                    }
                  }}
                  className="w-32 min-w-[5rem] border-0 border-b-2 border-red-500 bg-transparent text-center text-3xl font-medium leading-9 text-sky-700 outline-none ring-0 focus:border-red-500"
                />
              </div>
            </div>

            <div className="inline-flex h-14 w-full items-start justify-start gap-4 self-stretch">
              <button
                type="button"
                onClick={goPreviousQuestion}
                disabled={currentIndex <= 0}
                className="flex h-14 w-36 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-medium leading-7 text-sky-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("assessment.previousQuestion")}
              </button>
              <div className="min-h-14 flex-1" aria-hidden />
              <button
                type="button"
                onClick={() => submitAnswer(false)}
                disabled={!canSubmit}
                className="flex h-14 w-28 shrink-0 items-center justify-center rounded-2xl bg-sky-700 text-lg font-medium leading-7 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {t("assessment.nextQuestion")}
              </button>
            </div>
          </div>
        ) : null}

        {tab === "current" && phase === "result" && (
          <div className="space-y-4">
            {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
            {detailDashboard}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startTest}
                className="rounded-2xl bg-[#045E96] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                {t("assessment.retest")}
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className="rounded-2xl border border-sky-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-indigo-100"
              >
                {t("assessment.testHistoryCta")}
              </button>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
            {historyLoading && <p className="text-sm text-gray-500">{t("assessment.historyLoading")}</p>}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-gray-500">{t("assessment.historyEmpty")}</p>
            )}

            {history.length > 0 && (
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <p className="font-semibold text-gray-900">{t("assessment.historyList")}</p>
                <select
                  value={selectedSessionId ?? ""}
                  onChange={async (e) => {
                    const id = Number(e.target.value);
                    if (!id) return;
                    setSelectedSessionId(id);
                    setDetail(await fetchAssessmentDetail(id));
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
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

      {sidePanel}
    </div>
  );
}
