"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MENTAL_MATH_ASSESSMENT_TOPICS,
  MENTAL_MATH_ASSESSMENT_TOTAL_MINUTES,
  MENTAL_MATH_ASSESSMENT_TOTAL_MS,
} from "@/config/mental-math-assessment";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AssessmentReport from "@/components/features/learning/assessment/AssessmentReport";
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
import { getMentalMathLesson, getMentalMathSecret } from "@/config/mental-math/catalog";
import {
  isMentalMathAnswerCorrect,
  parseFillInAnswer,
  questionExprForDisplay,
  resolveMentalMathAnswer,
} from "@/lib/mentalMathAnswer";

/** Intro copy uses same total duration as in-progress countdown (config). */
const ASSESSMENT_INTRO_DISPLAY_MS = MENTAL_MATH_ASSESSMENT_TOTAL_MS;

/** Paths match public/learning/previous.svg and next.svg; stroke uses currentColor for enabled/disabled tint. */
const QUESTION_GRID_PREV_PATH =
  "M16 12H8M12 16L8 12L12 8M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z";
const QUESTION_GRID_NEXT_PATH =
  "M8 12H16M12 16L16 12L12 8M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z";

/** Right-panel question map: design is 4 rows Ã— 5 pills per page. */
const SIDE_QUESTION_PILL_PAGE_SIZE = 20;

type Phase = "intro" | "inProgress" | "result";
type Tab = "current" | "history";

interface AssessmentQuestion {
  topicKey: string;
  expression: string;
  correctAnswer: string;
  acceptedAnswers: string[];
}

interface AssessmentRecord {
  question: AssessmentQuestion;
  userAnswer: string | null;
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

/** HH:MM:SS for countdown display (ceil to whole seconds). */
function formatHhMmSsFromMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

function mapRecordsToAnswers(records: AssessmentRecord[]): AssessmentAnswerPayload[] {
  return records.map((row) => ({
    topic_key: row.question.topicKey,
    question_text: row.question.expression,
    user_answer: row.userAnswer,
    correct_answer: row.question.correctAnswer,
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

interface MentalMathAssessmentPanelProps {
  onBackToLessons?: () => void;
}

export default function MentalMathAssessmentPanel({ onBackToLessons }: MentalMathAssessmentPanelProps) {
  const t = useTranslations("learning");
  const tCommon = useTranslations("common");
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
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssessmentSessionDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [sideQuestionPillPage, setSideQuestionPillPage] = useState(1);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
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
  const parsedFillIn = parseFillInAnswer(answerInput);
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

  useEffect(() => {
    if (phase !== "inProgress") {
      return;
    }
    const targetPage = Math.floor(currentIndex / SIDE_QUESTION_PILL_PAGE_SIZE) + 1;
    setSideQuestionPillPage(targetPage);
  }, [currentIndex, phase]);

  const topicLabel = useCallback(
    (topicKey: string): string => {
      const [lessonKey, secretKey] = topicKey.split(".");
      return getMentalMathSecret(lessonKey, secretKey)?.title ?? topicKey;
    },
    []
  );

  const startTest = () => {
    const set = MENTAL_MATH_ASSESSMENT_TOPICS.filter((topic) => topic.questions.length > 0).map((topic) => {
      const random = topic.questions[Math.floor(Math.random() * topic.questions.length)];
      const answer = resolveMentalMathAnswer(random.expression);
      return {
        topicKey: topic.id,
        expression: random.expression,
        correctAnswer: answer.display,
        acceptedAnswers: answer.accepted,
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

  const performQuitTest = useCallback(() => {
    setQuitConfirmOpen(false);
    setPhase("intro");
    setQuestions([]);
    setRecords([]);
    setCurrentIndex(0);
    setAnswerInput("");
    setTestStartedAt(null);
    setQuestionStartedAt(null);
    setTimeLeftMs(MENTAL_MATH_ASSESSMENT_TOTAL_MS);
    setTab("current");
  }, []);

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
      const parsed = isTimeout ? null : parseFillInAnswer(answerInput);
      const row: AssessmentRecord = {
        question: currentQuestion,
        userAnswer: parsed,
        isCorrect:
          !isTimeout &&
          parsed !== null &&
          isMentalMathAnswerCorrect(parsed, currentQuestion.expression, currentQuestion.acceptedAnswers),
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

  const detailDashboard = detail ? (
    <AssessmentReport
      accuracy={accuracy}
      correctCount={correctCount}
      totalQuestions={totalQuestions}
      timeoutCount={timeoutCount}
      durationSeconds={detail.duration_seconds}
      attemptNumber={detail.attempt_number}
      trend={trend}
      answers={answers}
      categoryStats={categoryStats}
      topicLabel={topicLabel}
      categoryLabel={(category) => getMentalMathLesson(category)?.title ?? t(`mentalMathCategories.${category}`)}
      onOpenHistory={() => setTab("history")}
      onRetake={startTest}
    />
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

  const questionPillRows = (
    <div className="flex w-full flex-col gap-[clamp(1rem,2vw,1.5rem)]">
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
        <div
          key={`${safeSidePillPage}-${rowIdx}`}
          className="grid h-[clamp(2.5rem,3.5vw,3rem)] w-full grid-cols-5 gap-[clamp(0.25rem,0.6vw,0.375rem)]"
        >
          {row.map((num) => (
            <div
              key={num}
              className={`flex h-full min-w-0 items-center justify-center rounded-2xl bg-indigo-50 px-[clamp(0.25rem,0.8vw,0.75rem)] py-3 text-center text-[clamp(0.75rem,1.1vw,1rem)] font-normal leading-5 text-sky-700 ${
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
    <aside className="relative flex w-full min-w-0 shrink-0 flex-col self-start overflow-visible rounded-[32px] border border-white/60 bg-white/60 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60 xl:w-[clamp(18rem,28vw,28.6875rem)]">
      <div className="flex shrink-0 flex-col items-center overflow-visible px-[clamp(1rem,2vw,1.5rem)] pt-[clamp(2rem,4vw,3.5rem)]">
        <div className="relative mx-auto mt-4 shrink-0 overflow-visible">
          <svg
            viewBox="0 0 120 120"
            className="block h-[clamp(13.75rem,18vw,15rem)] w-[clamp(13.75rem,18vw,15rem)] -rotate-90 overflow-visible"
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
            <p className="mt-1 text-[clamp(1.75rem,3vw,2.25rem)] font-normal tabular-nums leading-none text-zinc-800">
              {formatHhMmSsFromMs(sideTimerDisplayMs)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 px-[clamp(1.5rem,2.5vw,2rem)] pb-8 pt-6">{questionPillRows}</div>
    </aside>
  ) : null;

  const mainCardClass =
    "flex min-w-0 w-full flex-col gap-5 self-start rounded-[32px] border border-white/60 bg-white/60 p-[clamp(1.5rem,2.5vw,2rem)] shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60";

  const showInProgressFillIn = tab === "current" && phase === "inProgress" && currentQuestion;

  return (
    <div
      className={
        showAssessmentSidePanel
          ? "flex w-full flex-col items-start gap-[clamp(1rem,1.5vw,1.25rem)] font-app-body xl:flex-row"
          : "w-full font-app-body"
      }
    >
      <div className={`${mainCardClass}${showAssessmentSidePanel ? " min-w-0 flex-1" : ""}`}>
        {tab === "current" && phase === "intro" && (
          <div className="flex flex-col gap-5 self-stretch">
            <div className="flex w-full flex-wrap items-center justify-between gap-3 self-stretch">
              <div className="flex items-center gap-4 py-px">
                <div className="flex items-center justify-center gap-2.5 rounded-2xl py-3">
                  <span className="text-2xl font-semibold leading-none text-sky-700">
                    {t("assessment.overviewTitle")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab("history")}
                className="flex items-center justify-center rounded-2xl bg-indigo-50 px-8 py-4 text-lg font-medium leading-7 text-sky-700 transition hover:bg-indigo-100"
              >
                {t("assessment.testHistoryCta")}
              </button>
            </div>
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
                onClick={() => setQuitConfirmOpen(true)}
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
                  inputMode="text"
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
                className={`flex h-14 w-28 shrink-0 items-center justify-center rounded-2xl text-lg font-medium leading-7 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none ${
                  currentIndex >= questions.length - 1
                    ? "bg-[#E45C44] shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)]"
                    : "bg-sky-700"
                }`}
              >
                {currentIndex >= questions.length - 1
                  ? t("assessment.submit")
                  : t("assessment.nextQuestion")}
              </button>
            </div>
          </div>
        ) : null}

        {tab === "current" && phase === "result" && (
          <div className="space-y-4">
            {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
            {detailDashboard}
          </div>
        )}

        {tab === "history" && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold leading-none text-sky-700">
              {t("assessment.testHistoryCta")}
            </h2>
            {saving && <p className="text-sm text-gray-500">{t("assessment.saving")}</p>}
            {historyLoading && <p className="text-sm text-gray-500">{t("assessment.historyLoading")}</p>}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-gray-500">{t("assessment.historyEmpty")}</p>
            )}

            {history.length > 0 && (
              <div className="flex max-h-[36rem] flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 py-2">
                {history.map((session) => {
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={async () => {
                        setSelectedSessionId(session.id);
                        setDetail(await fetchAssessmentDetail(session.id));
                        setPhase("result");
                        setTab("current");
                      }}
                      className="flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl bg-white/80 px-6 py-4 text-left transition duration-200 hover:scale-[1.01] hover:bg-[#D6E3F2] hover:shadow-[0px_10px_15px_0px_rgba(214,227,242,0.40)]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-base font-normal leading-6 text-sky-700">
                          {session.attempt_number}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-xl font-normal text-zinc-800">
                            {t("assessment.historyTestLabel", { attempt: session.attempt_number })}
                          </span>
                          <span className="text-base font-normal leading-5 text-sky-700">
                            {formatDateOnly(session.finished_at)}
                          </span>
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-6">
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-right text-xl font-normal leading-6 text-zinc-800">
                            {t("assessment.historyScore", {
                              correct: session.correct_count,
                              total: session.total_questions,
                            })}
                          </span>
                          <span className="text-right text-base font-normal leading-5 text-sky-700">
                            {t("assessment.historyTime", { time: formatDuration(session.duration_seconds) })}
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
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setTab("current");
                  onBackToLessons?.();
                }}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-indigo-50 px-6 py-4 text-base font-medium leading-6 text-sky-700 transition hover:bg-indigo-100"
              >
                {t("assessment.backToLessons")}
              </button>
              <button
                type="button"
                onClick={startTest}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-[#E45C44] px-6 py-4 text-base font-medium leading-6 text-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg transition hover:opacity-95"
              >
                {t("assessment.retest")}
              </button>
            </div>
          </div>
        )}
      </div>

      {sidePanel}

      <ConfirmDialog
        open={quitConfirmOpen}
        title={t("assessment.quitTest")}
        message={t("assessment.quitConfirm")}
        confirmLabel={tCommon("confirm")}
        cancelLabel={tCommon("cancel")}
        destructive
        onConfirm={performQuitTest}
        onCancel={() => setQuitConfirmOpen(false)}
      />
    </div>
  );
}
