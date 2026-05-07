"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MENTAL_MATH_SECRET_QUESTIONS, MENTAL_MATH_SECRET_ORDER } from "@/config/mental-math-questions";
import { useMentalMathPractice } from "@/hooks/useMentalMathPractice";
import CircularProgressRing from "@/components/ui/CircularProgressRing";
import { fetchMakingWholeQuestionVideo, fetchMakingWholeSecretMedia } from "@/services/userApi";
import type { MentalMathSecretKey } from "@/types/learning";
import {
  getAttemptedQuestionIdSet,
  getFirstUnattemptedQuestionIndex,
  refreshMakingWholeProgress,
  getSecretProgressPercent,
  getSecretQuestionTotal,
  getSecretSolvedCount,
  recordMakingWholeAttempt,
  subscribePracticeProgress,
} from "@/lib/mentalMathPracticeProgress";

type MakingWholeLessonPanelProps = {
  selectedSecret: MentalMathSecretKey | null;
  onSelectedSecretChange?: (secret: MentalMathSecretKey | null) => void;
};

export default function MakingWholeLessonPanel({
  selectedSecret,
  onSelectedSecretChange,
}: MakingWholeLessonPanelProps) {
  const tLearn = useTranslations("learning");
  const tPractice = useTranslations("learning.practice");
  const tMedia = useTranslations("learning.media");
  const [viewMode, setViewMode] = useState<"overview" | "practice">("overview");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false);
  const [practiceProgressVersion, setPracticeProgressVersion] = useState(0);
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [isQuestionMapExpanded, setIsQuestionMapExpanded] = useState(false);
  const lastRecordedQuestionIdRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const questionResultRef = useRef<HTMLDivElement | null>(null);

  const currentQuestions = useMemo(
    () => (selectedSecret ? MENTAL_MATH_SECRET_QUESTIONS[selectedSecret] ?? [] : []),
    [selectedSecret]
  );

  const practice = useMentalMathPractice({
    questions: currentQuestions,
  });
  const selectedMapIndex =
    practice.phase === "ready"
      ? selectedStartIndex
      : Math.max(0, Math.min(currentQuestions.length - 1, practice.currentIndex - 1));
  const attemptedQuestionIds = useMemo(() => {
    void practiceProgressVersion;
    return selectedSecret ? getAttemptedQuestionIdSet(selectedSecret) : new Set<string>();
  }, [practiceProgressVersion, selectedSecret]);

  useEffect(() => subscribePracticeProgress(() => setPracticeProgressVersion((v) => v + 1)), []);
  useEffect(() => {
    void refreshMakingWholeProgress();
  }, []);

  useEffect(() => {
    if (practice.phase !== "questionResult") {
      return;
    }
    if (!selectedSecret) {
      return;
    }
    const questionId = practice.currentQuestion?.id;
    if (!questionId || lastRecordedQuestionIdRef.current === questionId) {
      return;
    }
    void recordMakingWholeAttempt(
      questionId,
      selectedSecret,
      practice.lastIsCorrect
    );
    lastRecordedQuestionIdRef.current = questionId;
  }, [practice.currentQuestion, practice.lastIsCorrect, practice.phase, selectedSecret]);

  useEffect(() => {
    if (practice.phase !== "questionResult") {
      return;
    }
    requestAnimationFrame(() => {
      questionResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [practice.phase, practice.currentIndex]);

  useEffect(() => {
    if (!selectedSecret) {
      practice.reset();
      setViewMode("overview");
      setMediaUrls([]);
      setMediaError(false);
      setIsMediaLoading(false);
      setIsVideoDialogOpen(false);
      setVideoUrl(null);
      setIsVideoLoading(false);
      setVideoError(false);
      setIsVideoPlaying(false);
      setIsSecretDialogOpen(false);
      setSelectedStartIndex(0);
      setIsQuestionMapExpanded(false);
      lastRecordedQuestionIdRef.current = null;
      return;
    }
    practice.reset();
    setViewMode("overview");
    setMediaUrls([]);
    setMediaError(false);
    setIsMediaLoading(true);
    setIsVideoDialogOpen(false);
    setVideoUrl(null);
    setIsVideoLoading(false);
    setVideoError(false);
    setIsVideoPlaying(false);
    setIsSecretDialogOpen(false);
    setSelectedStartIndex(getFirstUnattemptedQuestionIndex(selectedSecret));
    setIsQuestionMapExpanded(false);
    lastRecordedQuestionIdRef.current = null;
    // Reset only when the selected secret changes. Depending on the whole
    // practice object causes an effect loop because hook methods are recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSecret]);

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

  useEffect(() => {
    if (!selectedSecret) {
      return;
    }
    let isMounted = true;
    setIsMediaLoading(true);
    setMediaError(false);

    fetchMakingWholeSecretMedia(selectedSecret)
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setMediaUrls(result.urls);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setMediaUrls([]);
        setMediaError(true);
      })
      .finally(() => {
        if (isMounted) {
          setIsMediaLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSecret]);

  if (!selectedSecret) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MENTAL_MATH_SECRET_ORDER.map((secretKey, secretIndex) => {
          void practiceProgressVersion;
          const progressPercent = getSecretProgressPercent(secretKey);
          const solvedCount = getSecretSolvedCount(secretKey);
          const totalCount = getSecretQuestionTotal(secretKey);
          return (
          <article
            key={secretKey}
            className="relative flex h-full flex-col rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]"
          >
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src="/learning/mental_math/mental_math.png"
                alt={tLearn(`makingWholeSecrets.${secretKey}` as "makingWholeSecrets.secret1")}
                className="h-[90px] w-full object-cover"
              />
              <span className="absolute right-2 top-2 rounded-md bg-[#4ADE80] px-2 py-0.5 text-sm font-semibold text-white">
                {tLearn("home.statusFree")}
              </span>
            </div>

            <div className="mt-4 min-h-[78px]">
              <p className="text-[14px] leading-5 text-[#106FAA]">{tLearn("home.pillCourse")}</p>
              <h3 className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[20px] font-semibold leading-7 text-[#045E96]">
                {tLearn(`makingWholeSecrets.${secretKey}` as "makingWholeSecrets.secret1")}
              </h3>
            </div>
            <div className="mb-5 mt-4 h-px bg-slate-200" />

            <div className="mt-auto flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <CircularProgressRing value={progressPercent} size={28} />
                <p className="text-base font-semibold text-[#333]">
                 {tLearn("home.progressPercent", { value: progressPercent })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectedSecretChange?.(secretKey)}
                className="rounded-full bg-[#045E96] px-6 py-1.5 text-base font-semibold text-[#EDF4FC]"
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

  return (
    <div className="space-y-5">
      {viewMode === "overview" ? (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
          {isMediaLoading ? <p className="text-sm text-[#045E96]">{tMedia("loading")}</p> : null}
          {mediaError ? <p className="text-sm text-[#D14343]">{tMedia("loadFailed")}</p> : null}
          {!isMediaLoading && !mediaError && mediaUrls.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {mediaUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={tLearn(`makingWholeSecrets.${selectedSecret}` as "makingWholeSecrets.secret1")}
                  className="h-auto w-full rounded-[18px] border border-[#D8E8F4] bg-[#F7FBFF] object-cover"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {viewMode === "overview" ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setViewMode("practice")}
            className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
          >
            Got It
          </button>
        </div>
      ) : null}

      {viewMode === "practice" ? (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
        <div className="mb-4 rounded-[16px] bg-[#EDF4FC] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#045E96]">
              {tLearn(`makingWholeSecrets.${selectedSecret}` as "makingWholeSecrets.secret1")}
            </p>
            <p className="text-sm font-semibold text-[#045E96]">
              {getSecretSolvedCount(selectedSecret)}/{getSecretQuestionTotal(selectedSecret)}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[#045E96]"
              style={{ width: `${getSecretProgressPercent(selectedSecret)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#106FAA]">
            {tLearn("home.progressPercent", { value: getSecretProgressPercent(selectedSecret) })}
          </p>
          {practice.phase === "ready" || practice.phase === "inProgress" || practice.phase === "questionResult" ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsQuestionMapExpanded((open) => !open)}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[#045E96]"
              >
                {isQuestionMapExpanded ? tPractice("collapseQuestionMap") : tPractice("expandQuestionMap")}
              </button>
              {isQuestionMapExpanded ? (
                <div className="mt-3 rounded-[14px] bg-white p-3">
                  <p className="mb-3 text-sm font-semibold text-[#106FAA]">{tPractice("questionMapTitle")}</p>
                  <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
                    {currentQuestions.map((question, index) => {
                      const isAttempted = attemptedQuestionIds.has(question.id);
                      const isSelected = selectedMapIndex === index;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => {
                            if (practice.phase === "ready") {
                              setSelectedStartIndex(index);
                              return;
                            }
                            practice.jumpToQuestion(index);
                          }}
                          className={`rounded-lg border px-2 py-1.5 text-sm font-semibold transition ${
                            isSelected
                              ? "border-[#045E96] bg-[#045E96] text-white"
                              : isAttempted
                                ? "border-[#BDE7CC] bg-[#E8F8EE] text-[#1A7F46]"
                                : "border-[#CFE1EE] bg-white text-[#045E96]"
                          }`}
                          title={
                            isAttempted
                              ? tPractice("questionMapAttempted", { index: index + 1 })
                              : tPractice("questionMapUnattempted", { index: index + 1 })
                          }
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSecretDialogOpen(true)}
            className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm font-semibold text-[#045E96]"
          >
            {tPractice("showCurrentSecret")}
          </button>
        </div>
        {practice.phase === "ready" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("questionNumber")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">0</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("accuracy")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">0%</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("currentStreak")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">0</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("avgTime")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">0s</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => practice.start(selectedStartIndex)}
                className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
              >
                {tPractice("startPractice")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("overview")}
                className="rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
              >
                {tLearn("navigation.backOneLevel")}
              </button>
            </div>
          </div>
        ) : null}

        {practice.phase === "inProgress" || practice.phase === "questionResult" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("questionNumber")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">{practice.currentIndex}</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("accuracy")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">{practice.accuracy}%</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("currentStreak")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">{practice.currentStreak}</p>
              </div>
              <div className="rounded-[18px] bg-[#EDF4FC] p-4">
                <p className="text-sm text-[#106FAA]">{tPractice("elapsed")}</p>
                <p className="mt-2 text-2xl font-semibold text-[#045E96]">
                  {tPractice("seconds", { value: practice.elapsedSeconds })}
                </p>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#F7FBFF] p-6 text-center">
              <p className="text-sm font-medium text-[#106FAA]">
                {tPractice("progressNow", { current: practice.currentIndex })}
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#045E96]">
                {practice.currentQuestion?.expression ?? "--"}
              </p>
            </div>

            {practice.phase === "inProgress" ? (
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={practice.inputAnswer}
                  onChange={(event) => practice.setInputAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && practice.canSubmit) {
                      event.preventDefault();
                      practice.submitCurrentAnswer();
                    }
                  }}
                  placeholder={tPractice("answerPlaceholder")}
                  className="h-12 flex-1 rounded-full border border-[#CFE1EE] bg-white px-5 text-base text-[#045E96] outline-none"
                />
                <button
                  type="button"
                  onClick={practice.submitCurrentAnswer}
                  disabled={!practice.canSubmit}
                  className="h-12 rounded-full bg-[#045E96] px-6 text-base font-semibold text-white disabled:opacity-50"
                >
                  {tPractice("submit")}
                </button>
              </div>
            ) : null}

            {practice.phase === "questionResult" ? (
              <div ref={questionResultRef} className="space-y-4">
                <div
                  className={`rounded-[20px] p-5 ${
                    practice.lastIsCorrect ? "bg-[#E8F8EE] text-[#1A7F46]" : "bg-[#FFF1F0] text-[#C93C32]"
                  }`}
                >
                  <p className="text-lg font-semibold">
                    {practice.lastIsCorrect ? tPractice("correct") : tPractice("incorrect")}
                  </p>
                  <p className="mt-2 text-sm">
                    {tPractice("yourAnswer", { answer: practice.lastSubmittedAnswer ?? "-" })}
                  </p>
                  <p className="mt-1 text-sm">
                    {tPractice("correctAnswer", { answer: practice.lastCorrectAnswer ?? "-" })}
                  </p>
                  <p className="mt-1 text-sm">
                    {tPractice("questionTime", { duration: practice.lastQuestionDurationSeconds })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={practice.next}
                  className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
                >
                  {tPractice("nextQuestion")}
                </button>
                <button
                  type="button"
                  onClick={openQuestionVideo}
                  className="ml-3 rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
                >
                  {tPractice("explainWithAi")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {practice.phase === "milestone" ? (
          <div className="space-y-4">
            <h4 className="text-2xl font-semibold text-[#045E96]">{tPractice("milestoneTitle")}</h4>
            <p className="text-sm text-[#106FAA]">{tPractice("milestoneHint", { total: practice.answeredCount })}</p>
            <p className="text-sm text-[#045E96]">{tPractice("accuracyLine", { value: practice.accuracy })}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={practice.continuePractice}
                className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
              >
                {tPractice("continuePractice")}
              </button>
              <button
                type="button"
                onClick={practice.finishSession}
                className="rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
              >
                {tPractice("finishSession")}
              </button>
              <button
                type="button"
                onClick={() => {
                  practice.reset();
                  onSelectedSecretChange?.(null);
                }}
                className="rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
              >
                {tLearn("navigation.backOneLevel")}
              </button>
            </div>
          </div>
        ) : null}

        {practice.phase === "summary" ? (
          <div className="space-y-4">
            <h4 className="text-2xl font-semibold text-[#045E96]">{tPractice("sessionSummaryTitle")}</h4>
            <p className="text-sm text-[#045E96]">
              {tPractice("score", { score: practice.correctCount, total: practice.answeredCount })}
            </p>
            <p className="text-sm text-[#045E96]">
              {tPractice("accuracyLine", { value: practice.accuracy })}
            </p>
            <p className="text-sm text-[#045E96]">
              {tPractice("totalTime", { duration: practice.totalDurationSeconds })}
            </p>
            <p className="text-sm text-[#045E96]">
              {tPractice("bestStreak", { value: practice.bestStreak })}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => practice.start()}
                className="rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-white"
              >
                {tPractice("retry")}
              </button>
              <button
                type="button"
                onClick={practice.reset}
                className="rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
              >
                {tPractice("nextCategory")}
              </button>
              <button
                type="button"
                onClick={() => {
                  practice.reset();
                  onSelectedSecretChange?.(null);
                }}
                className="rounded-full bg-[#EDF4FC] px-6 py-2 text-base font-semibold text-[#045E96]"
              >
                {tLearn("navigation.backOneLevel")}
              </button>
            </div>
          </div>
        ) : null}
        </section>
      ) : null}

      {isVideoDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={tPractice("aiVideoTitle")}
          onClick={() => {
            setIsVideoDialogOpen(false);
            setIsVideoPlaying(false);
          }}
        >
          <div
            className="w-full max-w-4xl rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-xl font-semibold text-[#045E96]">{tPractice("aiVideoTitle")}</h4>
              <button
                type="button"
                onClick={() => {
                  setIsVideoDialogOpen(false);
                  setIsVideoPlaying(false);
                }}
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
      {isSecretDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={tPractice("currentSecretTitle")}
          onClick={() => setIsSecretDialogOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-xl font-semibold text-[#045E96]">{tPractice("currentSecretTitle")}</h4>
              <button
                type="button"
                onClick={() => setIsSecretDialogOpen(false)}
                className="rounded-full bg-[#EDF4FC] px-4 py-2 text-sm font-semibold text-[#045E96]"
              >
                {tPractice("closeCurrentSecret")}
              </button>
            </div>
            {isMediaLoading ? <p className="text-sm text-[#045E96]">{tMedia("loading")}</p> : null}
            {mediaError ? <p className="text-sm text-[#D14343]">{tMedia("loadFailed")}</p> : null}
            {!isMediaLoading && !mediaError && mediaUrls.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {mediaUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={tLearn(`makingWholeSecrets.${selectedSecret}` as "makingWholeSecrets.secret1")}
                    className="h-auto w-full rounded-[18px] border border-[#D8E8F4] bg-[#F7FBFF] object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
