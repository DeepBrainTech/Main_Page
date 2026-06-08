"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getMentalMathLesson, getMentalMathSecret } from "@/config/mental-math/catalog";
import { useMentalMathPractice, type MentalMathPracticeRecord } from "@/hooks/useMentalMathPractice";
import AssessmentReport from "@/components/features/learning/assessment/AssessmentReport";
import PracticeReportHistoryPanel from "@/components/features/learning/PracticeReportHistoryPanel";
import CircularProgressRing from "@/components/ui/CircularProgressRing";
import type { MentalMathQuestion, MentalMathSecretKey } from "@/types/learning";
import {
  getAttemptedQuestionIdSet,
  getFirstUnattemptedQuestionIndex,
  getSecretPracticeRecords,
  getSecretProgressPercent,
  getSecretQuestionTotal,
  getSecretSolvedCount,
  hasSecretPracticeReport,
  fetchSecretPracticeReport,
  fetchSecretPracticeReportById,
  fetchSecretPracticeReportHistory,
  mapPracticeHistoryToTrend,
  saveSecretPracticeReport,
  recordMentalMathAttempt,
  flushMentalMathPracticeProgress,
  refreshLessonProgress,
  resetMentalMathSecretProgress,
  subscribePracticeProgress,
} from "@/lib/mentalMathPracticeProgress";
import { questionExprForDisplay, resolveMentalMathAnswer } from "@/lib/mentalMathAnswer";
import { buildQuestionHints } from "@/lib/mentalMathQuestionHints";
import { fetchMakingWholeQuestionVideo, recordLearningStudyTime } from "@/services/userApi";
import type { AssessmentAnswerPayload, AssessmentTrendPoint } from "@/services/userApi";
import type { PersistedSecretPracticeReport } from "@/lib/mentalMathPracticeProgress";

type MakingWholeLessonPanelProps = {
  lessonKey: string;
  selectedSecret: MentalMathSecretKey | null;
  onSelectedSecretChange?: (secret: MentalMathSecretKey | null) => void;
};

function questionPrompt(expression: string): string {
  return expression.includes("○") ? expression : `${expression} = ?`;
}

function formatHhMmSs(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildPracticeReportAnswers(
  records: MentalMathPracticeRecord[],
  questions: MentalMathQuestion[],
  secretKey: string
): AssessmentAnswerPayload[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  return records.map((record) => {
    const question = questionById.get(record.questionId);
    const resolved = question?.answerText
      ? { display: question.answerText }
      : question
        ? resolveMentalMathAnswer(question.expression)
        : { display: "-" };
    return {
      topic_key: secretKey,
      question_text: question ? questionExprForDisplay(question.expression) : record.questionId,
      user_answer: record.userAnswer,
      correct_answer: resolved.display,
      is_correct: record.isCorrect,
      is_timeout: false,
      time_spent_ms: record.questionDurationSeconds * 1000,
    };
  });
}

export default function MakingWholeLessonPanel({
  lessonKey,
  selectedSecret,
  onSelectedSecretChange,
}: MakingWholeLessonPanelProps) {
  const tLearn = useTranslations("learning");
  const tPractice = useTranslations("learning.practice");
  const lesson = getMentalMathLesson(lessonKey);
  const selectedSecretData = selectedSecret ? getMentalMathSecret(lessonKey, selectedSecret) : null;
  const [viewMode, setViewMode] = useState<"overview" | "practice" | "history">("overview");
  const [showSecretTip, setShowSecretTip] = useState(false);
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(() => new Set());
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [practiceProgressVersion, setPracticeProgressVersion] = useState(0);
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [viewingPersistedReport, setViewingPersistedReport] = useState<PersistedSecretPracticeReport | null>(null);
  const [savedSummaryReport, setSavedSummaryReport] = useState<PersistedSecretPracticeReport | null>(null);
  const [practiceReportTrend, setPracticeReportTrend] = useState<AssessmentTrendPoint[]>([]);
  const summarySaveKeyRef = useRef<string | null>(null);
  const pendingReportSecretRef = useRef<MentalMathSecretKey | null>(null);
  const historyReturnReportRef = useRef<PersistedSecretPracticeReport | null>(null);
  const recordedStudySecondsRef = useRef(0);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentQuestions: MentalMathQuestion[] = useMemo(() => {
    if (!lesson || !selectedSecretData) {
      return [];
    }
    return selectedSecretData.questions.map((question) => ({
      id: question.id,
      lessonKey: lesson.key,
      secretKey: selectedSecretData.key,
      expression: question.expression,
      prompt: questionPrompt(question.expression),
      techniqueTitle: selectedSecretData.title,
      techniqueSummary: selectedSecretData.techniqueSummary,
      hints: buildQuestionHints({
        lesson,
        secret: selectedSecretData,
        expression: question.expression,
        presetHints: question.hints,
      }),
    }));
  }, [lesson, selectedSecretData]);

  const practice = useMentalMathPractice({
    questions: currentQuestions,
    onQuestionAnswered: (questionId, isCorrect, userAnswer, questionDurationSeconds) => {
      if (!selectedSecret) {
        return;
      }
      recordMentalMathAttempt(
        lessonKey,
        selectedSecret,
        questionId,
        isCorrect,
        userAnswer,
        questionDurationSeconds
      );
    },
  });
  const attemptedQuestionIds = useMemo(() => {
    void practiceProgressVersion;
    const ids = selectedSecret ? getAttemptedQuestionIdSet(lessonKey, selectedSecret) : new Set<string>();
    practice.records.forEach((record) => ids.add(record.questionId));
    return ids;
  }, [lessonKey, practice.records, practiceProgressVersion, selectedSecret]);

  const practiceTopicLabel = useCallback(
    (topicKey: string) => {
      const secret = getMentalMathSecret(lessonKey, topicKey);
      if (!secret) {
        return topicKey;
      }
      return `Secret ${secret.key.replace("secret", "")}: ${secret.title}`;
    },
    [lessonKey]
  );

  const practiceReportAnswers = useMemo((): AssessmentAnswerPayload[] => {
    if (!selectedSecret) {
      return [];
    }
    if (viewingPersistedReport) {
      return viewingPersistedReport.answers;
    }
    if (practice.phase !== "summary") {
      return [];
    }
    return buildPracticeReportAnswers(practice.records, currentQuestions, selectedSecret);
  }, [currentQuestions, practice.phase, practice.records, selectedSecret, viewingPersistedReport]);

  const activePracticeReport = viewingPersistedReport ?? savedSummaryReport ?? (
    practice.phase === "summary"
      ? {
          accuracy: practice.accuracy,
          correctCount: practice.correctCount,
          totalQuestions: practice.answeredCount,
          durationSeconds: practice.totalDurationSeconds,
          attemptNumber: 1,
        }
      : null
  );

  const loadPracticeReportTrend = useCallback(
    async (pendingReport?: PersistedSecretPracticeReport | null) => {
      if (!selectedSecret) {
        setPracticeReportTrend([]);
        return;
      }
      try {
        const { list } = await fetchSecretPracticeReportHistory(lessonKey, selectedSecret, 20, 0);
        let trendPoints = mapPracticeHistoryToTrend(list);
        if (
          pendingReport &&
          !list.some(
            (row) =>
              (pendingReport.id != null && row.id === pendingReport.id) ||
              (row.attemptNumber === pendingReport.attemptNumber &&
                row.accuracy === pendingReport.accuracy &&
                row.totalQuestions === pendingReport.totalQuestions)
          )
        ) {
          trendPoints = [
            ...trendPoints,
            {
              session_id: pendingReport.id ?? 0,
              finished_at: pendingReport.finishedAt ?? new Date().toISOString(),
              accuracy: pendingReport.accuracy,
              duration_seconds: pendingReport.durationSeconds,
            },
          ];
        }
        setPracticeReportTrend(trendPoints);
      } catch {
        setPracticeReportTrend([]);
      }
    },
    [lessonKey, selectedSecret]
  );

  useEffect(() => {
    if (!selectedSecret || viewMode !== "practice" || !activePracticeReport) {
      setPracticeReportTrend([]);
      return;
    }
    const pendingReport =
      practice.phase === "summary" && !viewingPersistedReport ? savedSummaryReport : null;
    void loadPracticeReportTrend(pendingReport);
  }, [
    activePracticeReport,
    loadPracticeReportTrend,
    practice.phase,
    practiceProgressVersion,
    savedSummaryReport,
    selectedSecret,
    viewMode,
    viewingPersistedReport,
  ]);

  const startPracticeSession = useCallback(
    async (startIndex = selectedStartIndex) => {
      if (selectedSecret) {
        await flushMentalMathPracticeProgress();
        await refreshLessonProgress(lessonKey);
      }
      recordedStudySecondsRef.current = 0;
      setShowSecretTip(false);
      setViewingPersistedReport(null);
      setSavedSummaryReport(null);
      summarySaveKeyRef.current = null;
      setViewMode("practice");
      const resumeIndex =
        selectedSecret != null ? getFirstUnattemptedQuestionIndex(lessonKey, selectedSecret) : startIndex;
      const initialRecords =
        selectedSecret != null ? getSecretPracticeRecords(lessonKey, selectedSecret) : [];
      practice.start({
        startIndex: resumeIndex,
        initialRecords,
      });
    },
    [lessonKey, practice, selectedSecret, selectedStartIndex]
  );

  const nextSecretKey = useMemo((): MentalMathSecretKey | null => {
    if (!lesson || !selectedSecret) {
      return null;
    }
    const secretKeys = lesson.secrets.map((secret) => secret.key);
    const currentIndex = secretKeys.indexOf(selectedSecret);
    if (currentIndex < 0 || currentIndex >= secretKeys.length - 1) {
      return null;
    }
    return secretKeys[currentIndex + 1] as MentalMathSecretKey;
  }, [lesson, selectedSecret]);

  const openPracticeHistory = useCallback(() => {
    if (!selectedSecret) {
      return;
    }
    if (viewingPersistedReport) {
      historyReturnReportRef.current = viewingPersistedReport;
    } else if (practice.phase === "summary") {
      historyReturnReportRef.current =
        savedSummaryReport ?? {
          accuracy: practice.accuracy,
          correctCount: practice.correctCount,
          totalQuestions: practice.answeredCount,
          durationSeconds: practice.totalDurationSeconds,
          attemptNumber: 1,
          answers: buildPracticeReportAnswers(practice.records, currentQuestions, selectedSecret),
        };
    } else {
      historyReturnReportRef.current = null;
    }
    setViewingPersistedReport(null);
    practice.reset();
    setViewMode("history");
  }, [currentQuestions, practice, savedSummaryReport, selectedSecret, viewingPersistedReport]);

  const closePracticeHistory = useCallback(() => {
    const returnReport = historyReturnReportRef.current;
    if (returnReport) {
      setViewingPersistedReport(returnReport);
      setViewMode("practice");
      return;
    }
    setViewMode("overview");
  }, []);

  const handleSelectHistoryReport = useCallback(async (reportId: number) => {
    const report = await fetchSecretPracticeReportById(reportId);
    if (!report) {
      return;
    }
    historyReturnReportRef.current = null;
    setViewingPersistedReport(report);
    setViewMode("practice");
  }, []);

  const goToNextSecret = useCallback(() => {
    if (!nextSecretKey) {
      return;
    }
    setViewingPersistedReport(null);
    practice.reset();
    setViewMode("overview");
    onSelectedSecretChange?.(nextSecretKey);
  }, [nextSecretKey, onSelectedSecretChange, practice]);

  const handleViewSecretReport = useCallback(
    (secretKey: MentalMathSecretKey) => {
      pendingReportSecretRef.current = secretKey;
      onSelectedSecretChange?.(secretKey);
    },
    [onSelectedSecretChange]
  );

  useEffect(() => subscribePracticeProgress(() => setPracticeProgressVersion((v) => v + 1)), []);
  useEffect(() => {
    void refreshLessonProgress(lessonKey);
  }, [lessonKey, selectedSecret]);

  useEffect(() => {
    if (viewMode !== "practice" || practice.phase !== "inProgress" || !practice.currentQuestion) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      answerInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [practice.currentIndex, practice.currentQuestion, practice.phase, viewMode]);

  const currentHints = practice.currentQuestion?.hints ?? [];

  useEffect(() => {
    if (!showSecretTip) {
      setRevealedHintIndices(new Set());
    }
  }, [showSecretTip]);

  useEffect(() => {
    setShowSecretTip(false);
    setRevealedHintIndices(new Set());
    setIsVideoDialogOpen(false);
    setVideoUrl(null);
    setIsVideoLoading(false);
    setVideoError(false);
    setIsVideoPlaying(false);
  }, [practice.currentQuestion?.id]);

  const openQuestionVideo = async () => {
    if (!selectedSecret || practice.currentIndex < 1) {
      return;
    }
    setIsVideoDialogOpen(true);
    setIsVideoLoading(true);
    setVideoError(false);
    setIsVideoPlaying(false);
    setVideoUrl(null);
    const minGeneratingMs = 3000 + Math.random() * 4000;
    try {
      const [result] = await Promise.all([
        fetchMakingWholeQuestionVideo(selectedSecret, practice.currentIndex),
        new Promise<true>((resolve) => {
          setTimeout(() => resolve(true), minGeneratingMs);
        }),
      ]);
      setVideoUrl(result.url);
    } catch {
      setVideoUrl(null);
      setVideoError(true);
    } finally {
      setIsVideoLoading(false);
    }
  };

  const closeVideoDialog = () => {
    setIsVideoDialogOpen(false);
    setIsVideoPlaying(false);
  };

  const handleResetSecretProgress = async () => {
    if (!selectedSecret || isResettingProgress) {
      return;
    }
    setIsResettingProgress(true);
    try {
      await resetMentalMathSecretProgress(lessonKey, selectedSecret);
      recordedStudySecondsRef.current = 0;
      setViewingPersistedReport(null);
      setSelectedStartIndex(0);
      if (viewMode === "practice") {
        practice.start(0);
      }
    } catch {
      // ignore reset failure; user can retry
    } finally {
      setIsResettingProgress(false);
    }
  };

  useEffect(() => {
    void flushMentalMathPracticeProgress();

    if (pendingReportSecretRef.current && selectedSecret === pendingReportSecretRef.current) {
      const secretKey = pendingReportSecretRef.current;
      pendingReportSecretRef.current = null;
      void (async () => {
        await refreshLessonProgress(lessonKey);
        const savedReport = await fetchSecretPracticeReport(lessonKey, secretKey);
        if (!savedReport) {
          onSelectedSecretChange?.(null);
          return;
        }
        setViewingPersistedReport(savedReport);
        setViewMode("practice");
      })();
      return;
    }

    setViewingPersistedReport(null);
    setSavedSummaryReport(null);
    summarySaveKeyRef.current = null;
    practice.reset();
    setViewMode("overview");
    setShowSecretTip(false);
    setIsVideoDialogOpen(false);
    setVideoUrl(null);
    setIsVideoLoading(false);
    setVideoError(false);
    setIsVideoPlaying(false);
    recordedStudySecondsRef.current = 0;
    setSelectedStartIndex(selectedSecret ? getFirstUnattemptedQuestionIndex(lessonKey, selectedSecret) : 0);
    // Reset only when the selected secret changes. Depending on the whole
    // practice object causes an effect loop because hook methods are recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey, selectedSecret]);

  useEffect(() => {
    if (practice.phase !== "summary" || !selectedSecret || viewingPersistedReport) {
      if (practice.phase !== "summary") {
        summarySaveKeyRef.current = null;
        setSavedSummaryReport(null);
      }
      return;
    }
    const saveKey = [
      lessonKey,
      selectedSecret,
      practice.answeredCount,
      practice.correctCount,
      practice.accuracy,
      practice.totalDurationSeconds,
    ].join(":");
    if (summarySaveKeyRef.current === saveKey) {
      return;
    }
    summarySaveKeyRef.current = saveKey;

    void saveSecretPracticeReport(lessonKey, selectedSecret, {
      accuracy: practice.accuracy,
      correctCount: practice.correctCount,
      totalQuestions: practice.answeredCount,
      durationSeconds: practice.totalDurationSeconds,
      attemptNumber: 1,
      answers: buildPracticeReportAnswers(practice.records, currentQuestions, selectedSecret),
    }).then((saved) => {
      if (!saved) {
        return;
      }
      setSavedSummaryReport(saved);
      void loadPracticeReportTrend(saved);
    });
    void flushMentalMathPracticeProgress();
  }, [
    currentQuestions,
    lessonKey,
    loadPracticeReportTrend,
    practice.accuracy,
    practice.answeredCount,
    practice.correctCount,
    practice.phase,
    practice.records,
    practice.totalDurationSeconds,
    selectedSecret,
    viewingPersistedReport,
  ]);

  useEffect(() => {
    return () => {
      void flushMentalMathPracticeProgress();
    };
  }, []);

  useEffect(() => {
    if (viewingPersistedReport || practice.phase !== "summary" || practice.totalDurationSeconds <= 0) {
      return;
    }
    if (recordedStudySecondsRef.current === practice.totalDurationSeconds) {
      return;
    }
    recordedStudySecondsRef.current = practice.totalDurationSeconds;
    recordLearningStudyTime("mental_math", practice.totalDurationSeconds)
      .then(() => {
        window.dispatchEvent(new Event("learning-study-time-change"));
      })
      .catch(() => {});
  }, [practice.phase, practice.totalDurationSeconds, viewingPersistedReport]);

  if (!lesson) {
    return <p className="text-sm text-[#045E96]">{tLearn("lessonComingSoon")}</p>;
  }

  if (!selectedSecret || !selectedSecretData) {
    return (
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lesson.secrets.map((secret) => {
          void practiceProgressVersion;
          const progressPercent = getSecretProgressPercent(lesson.key, secret.key);
          const solvedCount = getSecretSolvedCount(lesson.key, secret.key);
          const totalCount = getSecretQuestionTotal(lesson.key, secret.key);
          const showViewReport = hasSecretPracticeReport(lesson.key, secret.key);
          return (
            <article
              key={secret.key}
              className="relative flex h-full flex-col rounded-[24px] border border-white/70 bg-white/80 p-[clamp(12px,1.25vw,16px)] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="/learning/mental_math/mental_math.png"
                  alt={secret.title}
                  className="h-[clamp(76px,6.25vw,90px)] w-full object-cover"
                />
                <span className="absolute right-2 top-2 rounded-md bg-[#4ADE80] px-2 py-0.5 text-sm font-semibold text-white">
                  {tLearn("home.statusFree")}
                </span>
              </div>

              <div className="mt-[clamp(10px,1.1vw,16px)] min-h-[calc(20px+clamp(15px,1.35vw,20px)*1.35*3)]">
                <p className="text-[14px] leading-5 text-[#106FAA]">
                  {tLearn("home.pillCourse")}
                </p>
                <h3 className="mt-1 break-words text-[clamp(15px,1.35vw,20px)] font-semibold leading-[1.35] text-[#045E96]">
                  Secret {secret.key.replace("secret", "")}: {secret.title}
                </h3>
              </div>
              <div className="mb-[clamp(10px,1.3vw,20px)] mt-[clamp(10px,1.1vw,16px)] h-px bg-slate-200" />

              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <CircularProgressRing value={progressPercent} size={28} />
                  <p className="text-base font-semibold text-[#333]">
                    {solvedCount}/{totalCount}
                  </p>
                  {showViewReport ? (
                    <button
                      type="button"
                      onClick={() => handleViewSecretReport(secret.key)}
                      className="shrink-0 rounded-xl bg-indigo-50 px-3 py-1 text-sm font-medium text-sky-700 transition hover:bg-indigo-100"
                    >
                      {tPractice("viewReport")}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectedSecretChange?.(secret.key)}
                  className="shrink-0 rounded-full bg-[#045E96] px-6 py-1.5 text-base font-semibold text-[#EDF4FC]"
                >
                  {tLearn("home.startLesson")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const timerSeconds = practice.phase === "summary" ? practice.totalDurationSeconds : practice.elapsedSeconds;
  const ringR = 52;
  const ringStroke = 10;
  const ringCirc = 2 * Math.PI * ringR;
  // Practice has no time limit — keep the ring full; only the elapsed clock updates.
  const ringDashOffset = 0;
  const showPracticeSidePanel = viewMode === "practice" && practice.phase === "inProgress";
  const practiceSidePanel = showPracticeSidePanel ? (
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
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-base font-normal leading-5 text-sky-700">{tPractice("elapsed")}</p>
            <p className="mt-1 text-[clamp(1.75rem,3vw,2.25rem)] font-normal tabular-nums leading-none text-zinc-800">
              {formatHhMmSs(timerSeconds)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-4 px-[clamp(1.5rem,2.5vw,2rem)] pb-8 pt-6">
        <div className="flex h-10 w-full items-center justify-between gap-3">
          <h3 className="text-[clamp(1rem,1.5vw,1.25rem)] font-semibold leading-none text-sky-700">
            {tPractice("questionMapTitle")}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleResetSecretProgress()}
              disabled={isResettingProgress}
              className="rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tPractice("resetSecretProgress")}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-[clamp(0.5rem,1vw,0.75rem)]">
          {currentQuestions.map((question, index) => {
            const isAttempted = attemptedQuestionIds.has(question.id);
            const isActive = practice.currentIndex === index + 1;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => practice.jumpToQuestion(index)}
                className={`flex h-[clamp(2.25rem,3.5vw,2.75rem)] items-center justify-center rounded-xl text-[clamp(0.75rem,1.1vw,0.875rem)] font-medium transition ${
                  isActive
                    ? "bg-sky-700 text-white"
                    : isAttempted
                      ? "bg-[#E8F8EE] text-[#1A7F46]"
                      : "bg-indigo-50 text-sky-700"
                }`}
                title={
                  isAttempted
                    ? tPractice("questionMapAttempted", { index: index + 1 })
                    : tPractice("questionMapUnattempted", { index: index + 1 })
                }
              >
                Q{index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  ) : null;

  return (
    <div className="space-y-5">
      {viewMode === "history" && selectedSecret && selectedSecretData ? (
        <PracticeReportHistoryPanel
          lessonKey={lessonKey}
          secretKey={selectedSecret}
          secretTitle={selectedSecretData.title}
          onBack={closePracticeHistory}
          onSelectReport={(reportId) => void handleSelectHistoryReport(reportId)}
        />
      ) : null}

      {viewMode === "overview" ? (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#106FAA]">
                {lesson.title} · Secret {selectedSecretData.key.replace("secret", "")}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-[#045E96]">
                Secret {selectedSecretData.key.replace("secret", "")}: {selectedSecretData.title}
              </h3>
            </div>
          </div>
          <div className="space-y-3 rounded-[18px] bg-[#F7FBFF] p-5">
            {selectedSecretData.review.map((line) => (
              <p key={line} className="text-sm leading-6 text-[#045E96]">
                {line}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {viewMode === "overview" ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => void startPracticeSession()}
            className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
          >
            Got It
          </button>
        </div>
      ) : null}

      {viewMode === "practice" ? (
        <div
          className={`flex w-full flex-col items-start gap-[clamp(1rem,1.5vw,1.25rem)]${
            practice.phase === "inProgress" && !viewingPersistedReport ? " xl:flex-row" : ""
          }`}
        >
        <section className="min-w-0 w-full flex-1 self-start rounded-[32px] border border-white/60 bg-white/60 p-[clamp(1.5rem,2.5vw,2rem)] shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60">
          {practice.phase === "inProgress" && practice.currentQuestion ? (
            <div className="flex flex-col gap-6 self-stretch">
              <div className="inline-flex h-14 w-full items-center justify-between self-stretch">
                <div className="flex items-center gap-4 py-px">
                  <div className="flex items-center justify-center gap-2.5 rounded-2xl py-3">
                    <span className="text-lg font-semibold leading-5 text-sky-700">
                      {tPractice("inProgressTitle")}
                    </span>
                  </div>
                  <div className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-indigo-50 px-5 py-3">
                    <span className="text-lg font-normal leading-5 text-sky-700">
                      {tPractice("questionCountPill", {
                        current: Math.max(1, practice.currentIndex),
                        total: currentQuestions.length,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    title={tPractice("aiExplainTooltip")}
                    aria-label={tPractice("aiExplainTooltip")}
                    onClick={openQuestionVideo}
                    className="inline-flex size-14 items-center justify-center rounded-2xl bg-[#E45C44] shadow-[0px_5px_10px_0px_rgba(228,92,68,0.20)] transition hover:opacity-95"
                  >
                    <Image src="/learning/ai.svg" alt="" width={28} height={28} aria-hidden />
                  </button>
                  <button
                    type="button"
                    title={tPractice("hintTooltip")}
                    aria-label={showSecretTip ? tPractice("hideSecretTip") : tPractice("hintTooltip")}
                    aria-pressed={showSecretTip}
                    onClick={() => setShowSecretTip((open) => !open)}
                    className="inline-flex size-14 items-center justify-center rounded-2xl bg-[#E45C44] shadow-[0px_5px_10px_0px_rgba(228,92,68,0.20)] transition hover:opacity-95"
                  >
                    <Image src="/learning/hint.svg" alt="" width={28} height={28} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={practice.finishSession}
                    className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 px-5 py-3 text-lg font-normal leading-5 text-sky-700 transition hover:bg-indigo-100"
                  >
                    {tPractice("quitPractice")}
                  </button>
                </div>
              </div>

              {showSecretTip && selectedSecretData && currentHints.length > 0 ? (
                <div className="relative inline-flex w-full flex-col items-start gap-2.5 self-stretch py-6 font-app-body">
                  <Image
                    src="/learning/hint_monkey.svg"
                    alt=""
                    width={64}
                    height={56}
                    className="absolute bottom-6 left-0 z-10 h-14 w-16 object-contain"
                    aria-hidden
                  />
                  <div className="relative ml-[4.5rem] min-h-24 w-[calc(100%-4.5rem)] rounded-tl-2xl rounded-tr-2xl rounded-br-2xl bg-orange-50 px-6 py-6 outline outline-2 outline-offset-[-2px] outline-amber-400/30">
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowSecretTip(false)}
                          className="shrink-0 text-sm font-normal leading-5 text-neutral-400 transition hover:text-neutral-500"
                        >
                          {tPractice("closeHint")}
                        </button>
                      </div>
                      {currentHints.map((hint, index) => {
                        const isRevealed = revealedHintIndices.has(index);
                        return (
                          <div key={`${practice.currentQuestion?.id}-hint-${index}`} className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-3">
                              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E45C44]">
                                <Image src="/learning/hint.svg" alt="" width={14} height={14} aria-hidden />
                              </span>
                              <p className="text-base font-semibold leading-5 text-red-500">
                                {tPractice("hintTitle", { num: index + 1 })}
                              </p>
                            </div>
                            {isRevealed ? (
                              <p className="pl-[46px] text-base font-normal leading-5 text-zinc-800">{hint}</p>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedHintIndices((prev) => {
                                    const next = new Set(prev);
                                    next.add(index);
                                    return next;
                                  })
                                }
                                className="w-fit pl-[46px] text-base font-normal leading-5 text-sky-700 underline-offset-2 transition hover:text-sky-800 hover:underline"
                              >
                                {tPractice("hintView")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col items-center justify-start gap-2.5 self-stretch rounded-2xl bg-white/90 px-12 py-11">
                <div className="inline-flex flex-wrap items-end justify-center gap-3">
                  <span className="text-3xl font-medium leading-9 text-sky-700">
                    {questionExprForDisplay(practice.currentQuestion.expression)} ={" "}
                  </span>
                  <input
                    ref={answerInputRef}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    aria-label={tPractice("answerPlaceholder")}
                    value={practice.inputAnswer}
                    onChange={(event) => practice.setInputAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && practice.canSubmit) {
                        event.preventDefault();
                        practice.submitCurrentAnswer();
                      }
                    }}
                    className="w-32 min-w-[5rem] border-0 border-b-2 border-red-500 bg-transparent text-center text-3xl font-medium leading-9 text-sky-700 outline-none ring-0 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="inline-flex h-14 w-full items-start justify-start gap-4 self-stretch">
                <button
                  type="button"
                  onClick={practice.goPreviousQuestion}
                  disabled={!practice.canGoPrevious}
                  className="flex h-14 w-36 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-medium leading-7 text-sky-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tPractice("previousQuestion")}
                </button>
                <div className="min-h-14 flex-1" aria-hidden />
                <button
                  type="button"
                  onClick={practice.submitCurrentAnswer}
                  disabled={!practice.canSubmit}
                  className={`flex h-14 w-28 shrink-0 items-center justify-center rounded-2xl text-lg font-medium leading-7 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none ${
                    practice.willCompleteAllOnSubmit
                      ? "bg-[#E45C44] shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)]"
                      : "bg-sky-700"
                  }`}
                >
                  {practice.willCompleteAllOnSubmit ? tPractice("submit") : tPractice("nextQuestion")}
                </button>
              </div>
            </div>
          ) : null}

          {activePracticeReport ? (
            <AssessmentReport
              accuracy={activePracticeReport.accuracy}
              correctCount={activePracticeReport.correctCount}
              totalQuestions={activePracticeReport.totalQuestions}
              timeoutCount={0}
              durationSeconds={activePracticeReport.durationSeconds}
              attemptNumber={activePracticeReport.attemptNumber}
              trend={practiceReportTrend}
              answers={practiceReportAnswers}
              categoryStats={[]}
              topicLabel={practiceTopicLabel}
              categoryLabel={(category) => getMentalMathLesson(category)?.title ?? category}
              variant="practice"
              onOpenHistory={openPracticeHistory}
              onRetake={goToNextSecret}
              secondaryActionLabel={tPractice("practiceHistory")}
              primaryActionLabel={tPractice("nextSecret")}
              primaryActionDisabled={nextSecretKey === null}
            />
          ) : null}
        </section>
        {practiceSidePanel}
        </div>
      ) : null}

      {isVideoDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={tPractice("aiVideoTitle")}
          onClick={closeVideoDialog}
        >
          <div
            className="w-full max-w-4xl rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-xl font-semibold text-[#045E96]">{tPractice("aiVideoTitle")}</h4>
              <button
                type="button"
                onClick={closeVideoDialog}
                className="rounded-full bg-[#EDF4FC] px-4 py-2 text-sm font-semibold text-[#045E96]"
              >
                {tPractice("closeAiVideo")}
              </button>
            </div>

            {isVideoLoading ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-8">
                <span
                  className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-[#CFE1EE] border-t-[#045E96]"
                  aria-hidden
                />
                <p className="text-center text-sm font-medium text-[#106FAA]">
                  {tPractice("aiExplanationGenerating")}
                </p>
              </div>
            ) : null}
            {videoError ? <p className="text-sm text-[#C93C32]">{tPractice("aiVideoLoadFailed")}</p> : null}
            {!isVideoLoading && !videoError && videoUrl ? (
              <div className="relative">
                <video
                  key={videoUrl}
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  className="max-h-[70vh] w-full rounded-[18px] bg-black"
                />
                {!isVideoPlaying ? (
                  <button
                    type="button"
                    aria-label={tPractice("playAiVideo")}
                    onClick={() => {
                      videoRef.current?.play();
                    }}
                    className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow-[0px_10px_24px_rgba(0,0,0,0.2)]"
                  >
                    <span
                      className="ml-1 block h-0 w-0 border-b-[14px] border-l-[22px] border-t-[14px] border-b-transparent border-l-[#045E96] border-t-transparent"
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
