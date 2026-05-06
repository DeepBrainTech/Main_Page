"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MENTAL_MATH_SECRET_QUESTIONS, MENTAL_MATH_SECRET_ORDER } from "@/config/mental-math-questions";
import { useMentalMathPractice } from "@/hooks/useMentalMathPractice";
import { fetchMakingWholeQuestionVideo, fetchMakingWholeSecretMedia } from "@/services/userApi";
import type { MentalMathSecretKey } from "@/types/learning";

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

  const currentQuestions = useMemo(
    () => (selectedSecret ? MENTAL_MATH_SECRET_QUESTIONS[selectedSecret] ?? [] : []),
    [selectedSecret]
  );

  const practice = useMentalMathPractice({
    questions: currentQuestions,
  });

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
    try {
      const result = await fetchMakingWholeQuestionVideo(selectedSecret, practice.currentIndex);
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
        {MENTAL_MATH_SECRET_ORDER.map((secretKey) => (
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
              <p className="text-base font-semibold text-[#333]">{tLearn("home.progressPercent", { value: 80 })}</p>
              <button
                type="button"
                onClick={() => onSelectedSecretChange?.(secretKey)}
                className="rounded-full bg-[#045E96] px-6 py-1.5 text-base font-semibold text-[#EDF4FC]"
              >
                {tLearn("home.startLesson")}
              </button>
            </div>
          </article>
        ))}
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
              <span className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm text-[#106FAA]">
                {tPractice("totalQuestions", { total: currentQuestions.length })}
              </span>
              <button
                type="button"
                onClick={practice.start}
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
              <div className="space-y-4">
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
                onClick={practice.start}
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
          onClick={() => setIsVideoDialogOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-xl font-semibold text-[#045E96]">{tPractice("aiVideoTitle")}</h4>
              <button
                type="button"
                onClick={() => setIsVideoDialogOpen(false)}
                className="rounded-full bg-[#EDF4FC] px-4 py-2 text-sm font-semibold text-[#045E96]"
              >
                {tPractice("closeAiVideo")}
              </button>
            </div>

            {isVideoLoading ? <p className="text-sm text-[#106FAA]">{tPractice("aiVideoLoading")}</p> : null}
            {videoError ? <p className="text-sm text-[#C93C32]">{tPractice("aiVideoLoadFailed")}</p> : null}
            {!isVideoLoading && !videoError && videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[70vh] w-full rounded-[18px] bg-black"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
