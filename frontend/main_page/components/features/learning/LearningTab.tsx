"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import MentalMathAssessmentPanel from "@/components/features/learning/MentalMathAssessmentPanel";
import MakingWholeLessonPanel from "@/components/features/learning/MakingWholeLessonPanel";
import LessonAccessTopBadge from "@/components/features/learning/LessonAccessTopBadge";
import UnlockBanner from "@/components/features/learning/UnlockBanner";
import UnlockCourseDialog from "@/components/features/learning/UnlockCourseDialog";
import { useLearningAccess } from "@/hooks/useLearningAccess";
import CircularProgressRing from "@/components/ui/CircularProgressRing";
import type { MentalMathSecretKey } from "@/types/learning";
import {
  getLessonProgressPercentByPractice,
  refreshMentalMathLessonProgress,
  refreshMakingWholeProgress,
  subscribePracticeProgress,
} from "@/lib/mentalMathPracticeProgress";

const MONTH_IDS = ["jan", "feb", "mar", "apr", "may", "jun", "jul"] as const;

const LESSON_ROWS = [
  { key: "assessment", kind: "quiz" as const },
  { key: "makingWhole", kind: "course" as const },
  { key: "breakIntoParts", kind: "course" as const },
  { key: "rearrange", kind: "course" as const },
  { key: "roundAdjust", kind: "course" as const },
  { key: "leftToRightFlow", kind: "course" as const },
  { key: "friendlyNumbers", kind: "course" as const },
  { key: "compensation", kind: "course" as const },
  { key: "multiplicationPatterns", kind: "course" as const },
  { key: "divisionShortcuts", kind: "course" as const },
] as const;

const UNLOCK_BANNER_INDEX = 2;
const BADGE_IDS = ["badgeNumberIgniter", "badgeFocusPilot", "badgeLogicExplorer"] as const;

/**
 * Lesson progress shown on cards.
 * For now, only makingWhole reads persisted practice progress;
 * other lessons default to 0 until their backend progress is available.
 */
function lessonProgressPercent(lessonKey: string): number {
  if (lessonKey === "makingWhole") {
    return getLessonProgressPercentByPractice("makingWhole");
  }
  return 0;
}

const completedMonthCount = 4;
const chartMinPercent = 25;
const chartMaxPercent = 100;
const chartMinHeightPx = 30;
const chartMaxHeightPx = 124;

function createWeeklyProgressData(monthLabels: string[]) {
  let seed = 42;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return monthLabels.map((monthLabel, monthIndex) => ({
    monthLabel,
    weeklyProgress: Array.from({ length: 4 }, () => {
      if (monthIndex >= completedMonthCount) {
        return 72;
      }
      return Math.round(chartMinPercent + nextRandom() * (chartMaxPercent - chartMinPercent));
    }),
  }));
}

export default function LearningTab() {
  const tLearn = useTranslations("learning.home");
  const tLearning = useTranslations("learning");
  const monthLabels = useMemo(
    () => MONTH_IDS.map((id) => tLearn(`month.${id}` as "month.jan")),
    [tLearn]
  );
  const weeklyProgressByMonth = useMemo(() => createWeeklyProgressData(monthLabels), [monthLabels]);
  const [showLessonBoard, setShowLessonBoard] = useState(false);
  const [activeLessonKey, setActiveLessonKey] = useState<string | null>(null);
  const [activeSecretKey, setActiveSecretKey] = useState<MentalMathSecretKey | null>(null);
  const [showUnlockCourseDialog, setShowUnlockCourseDialog] = useState(false);
  const [practiceProgressVersion, setPracticeProgressVersion] = useState(0);
  const learningAccess = useLearningAccess();
  const showUnlockBanner = !learningAccess.bundleUnlocked;

  useEffect(() => subscribePracticeProgress(() => setPracticeProgressVersion((v) => v + 1)), []);
  useEffect(() => {
    void refreshMakingWholeProgress();
    void refreshMentalMathLessonProgress();
  }, []);

  const lessonCards = useMemo(
    () =>
      LESSON_ROWS.map((row) => ({
        ...row,
        pill: row.kind === "quiz" ? tLearn("pillQuiz") : tLearn("pillCourse"),
        title: tLearn(`lessons.${row.key}` as "lessons.assessment"),
      })),
    [tLearn]
  );
  const activeLessonTitle =
    activeLessonKey && activeLessonKey !== "assessment"
      ? tLearn(`lessons.${activeLessonKey}` as "lessons.assessment")
      : activeLessonKey === "assessment"
        ? tLearn("lessons.assessment")
        : null;
  const activeSecretTitle = activeSecretKey
    ? tLearning(`makingWholeSecrets.${activeSecretKey}` as "makingWholeSecrets.secret1")
    : null;

  const toBarHeight = (percent: number) => {
    const clamped = Math.min(chartMaxPercent, Math.max(chartMinPercent, percent));
    const ratio = (clamped - chartMinPercent) / (chartMaxPercent - chartMinPercent);
    return Math.round(chartMinHeightPx + ratio * (chartMaxHeightPx - chartMinHeightPx));
  };

  const statCards = [
    { titleKey: "statCompleted" as const, value: "14%", iconSrc: "/learning/completed.svg" },
    { titleKey: "statLessons" as const, value: "1/10", iconSrc: "/learning/lessons.svg" },
    { titleKey: "statHours" as const, value: "11", iconSrc: "/learning/hours.svg" },
  ] as const;

  /** Lesson 0 self-assessment: focus layout without dashboard stats or sidebar widgets. */
  const hideLearningChromeForAssessment = showLessonBoard && activeLessonKey === "assessment";

  return (
    <div
      className={`grid grid-cols-1 items-stretch gap-5 pb-10 font-app-body xl:grid-cols-12 ${
        hideLearningChromeForAssessment ? "xl:grid-rows-1" : "xl:grid-rows-[auto_1fr]"
      }`}
    >
      {!hideLearningChromeForAssessment ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:col-span-8 xl:row-start-1">
          {statCards.map((item) => (
            <article
              key={item.titleKey}
              className="rounded-[20px] border border-white/70 bg-white/70 p-5 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#106FAA]">{tLearn(item.titleKey)}</h3>
                <Image
                  src={item.iconSrc}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 object-contain"
                  aria-hidden
                />
              </div>
              <p className="mt-6 text-left font-['Titan_One'] text-3xl text-[#045E96]">{item.value}</p>
            </article>
          ))}
        </section>
      ) : null}

      {!hideLearningChromeForAssessment ? (
        <aside className="space-y-5 rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md xl:col-span-4 xl:row-span-2 xl:row-start-1 xl:h-full xl:min-h-[760px]">
          <section>
            <h2 className="font-['Titan_One'] text-3xl text-[#045E96]">{tLearn("studyTrack")}</h2>
            <div className="mt-4 rounded-[24px] bg-[#E4F2F9] p-5">
              <h3 className="text-base font-semibold text-[#106FAA]">{tLearn("learningProgress")}</h3>
              <div className="mt-4 h-[168px]">
                <div className="flex h-[124px] items-end gap-1">
                  {weeklyProgressByMonth.flatMap(({ monthLabel, weeklyProgress }, monthIndex) =>
                    weeklyProgress.map((progressPercent, weekIndex) => (
                      <div
                        key={`${monthLabel}-${weekIndex}`}
                        className="w-[9px] rounded-full"
                        style={{
                          height: `${toBarHeight(progressPercent)}px`,
                          backgroundColor: monthIndex < completedMonthCount ? "#045E96" : "#A6C4D7",
                        }}
                        aria-hidden
                      />
                    ))
                  )}
                </div>
                <div className="mt-2 grid grid-cols-7 text-center text-xs text-black">
                  {monthLabels.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-['Titan_One'] text-3xl text-[#045E96]">{tLearn("badges")}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {BADGE_IDS.map((id) => (
                <div key={id} className="flex flex-col items-center gap-2">
                  <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#D8E8F4] bg-[#F7FBFF] text-2xl">
                    🏅
                  </div>
                  <p className="text-center text-xs font-medium text-black">{tLearn(id)}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      ) : null}

      <section
        className={`space-y-3 ${hideLearningChromeForAssessment ? "xl:col-span-12 xl:row-start-1 xl:self-start" : "xl:col-span-8 xl:row-start-2"}`}
      >
        {!showLessonBoard ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#106FAA]">{tLearn("lessonsHeading")}</h2>
            <article className="rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="overflow-hidden rounded-3xl md:w-[36%]">
                  <Image
                    src="/learning/mental_math/mental_math.png"
                    alt={tLearn("mentalMathTitle")}
                    width={420}
                    height={240}
                    className="h-[190px] w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-['Titan_One'] text-2xl text-[#045E96]">{tLearn("mentalMathTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#045E96]">{tLearn("mentalMathIntro")}</p>
                  <p className="mt-2 text-sm font-medium text-[#106FAA]">{tLearn("ageBand")}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm text-[#106FAA]">
                      {tLearn("lessonMeta", { lessonCount: 10, hours: 24 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLessonBoard(true)}
                      className="rounded-full bg-[#045E96] px-5 py-2 text-sm font-semibold text-[#EDF4FC] transition hover:opacity-95"
                    >
                      {tLearn("startLearning")}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-2xl font-semibold text-[#106FAA]">
              <button
                type="button"
                onClick={() => {
                  setShowLessonBoard(false);
                  setActiveLessonKey(null);
                  setActiveSecretKey(null);
                }}
                className="text-[#8CBBD8] transition hover:text-[#106FAA]"
              >
                {tLearn("breadcrumbLessons")}
              </button>
              <span className="mx-2 text-[#8CBBD8]">{">"}</span>
              {activeLessonKey ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLessonKey(null);
                      setActiveSecretKey(null);
                    }}
                    className="text-[#8CBBD8] transition hover:text-[#106FAA]"
                  >
                    {tLearn("breadcrumbMentalMath")}
                  </button>
                  <span className="mx-2 text-[#8CBBD8]">{">"}</span>
                  {activeSecretKey ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveSecretKey(null)}
                        className="text-[#8CBBD8] transition hover:text-[#106FAA]"
                      >
                        {activeLessonTitle}
                      </button>
                      <span className="mx-2 text-[#8CBBD8]">{">"}</span>
                      <span>{activeSecretTitle}</span>
                    </>
                  ) : (
                    <span>{activeLessonTitle}</span>
                  )}
                </>
              ) : (
                <span>{tLearn("breadcrumbMentalMath")}</span>
              )}
            </div>

            {activeLessonKey === "assessment" ? (
              <MentalMathAssessmentPanel onBackToLessons={() => setActiveLessonKey(null)} />
            ) : activeLessonKey === "makingWhole" ? (
              <section className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#045E96]">{tLearn("lessons.makingWhole")}</h3>
                  <button
                    type="button"
                    onClick={() => setActiveLessonKey(null)}
                    className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm font-semibold text-[#045E96]"
                  >
                    {tLearn("backToLessons")}
                  </button>
                </div>
                <MakingWholeLessonPanel
                  selectedSecret={activeSecretKey}
                  onSelectedSecretChange={setActiveSecretKey}
                />
              </section>
            ) : activeLessonKey ? (
              <section className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#045E96]">
                    {tLearn(`lessons.${activeLessonKey}` as "lessons.assessment")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveLessonKey(null);
                      setActiveSecretKey(null);
                    }}
                    className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm font-semibold text-[#045E96]"
                  >
                    {tLearn("backToLessons")}
                  </button>
                </div>
                <p className="text-sm leading-6 text-[#045E96]">{tLearn("lessonComingSoon")}</p>
              </section>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lessonCards.map((card, index) => {
                  const isAlwaysFreeLesson = card.key === "assessment" || card.key === "makingWhole";
                  const isLocked = !learningAccess.bundleUnlocked && !isAlwaysFreeLesson;
                  void practiceProgressVersion;
                  const progressPercent = lessonProgressPercent(card.key);
                  return (
                  <div key={card.key} className={index === UNLOCK_BANNER_INDEX ? "contents" : ""}>
                    {showUnlockBanner && index === UNLOCK_BANNER_INDEX ? (
                      <UnlockBanner
                        title={tLearn("unlockBannerTitle")}
                        description={tLearn("unlockBannerDescription")}
                        buttonLabel={tLearn("unlockBannerButton")}
                        className="md:col-span-2 xl:col-span-3"
                        onUnlockClick={() => setShowUnlockCourseDialog(true)}
                      />
                    ) : null}

                    <article className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
                      <div className="relative overflow-hidden rounded-2xl">
                        <Image
                          src="/learning/mental_math/mental_math.png"
                          alt={card.title}
                          width={276}
                          height={100}
                          className="h-[90px] w-full object-cover"
                        />
                        <LessonAccessTopBadge
                          access={learningAccess}
                          isAlwaysFreeLesson={isAlwaysFreeLesson}
                        />
                      </div>

                      <div className="mt-4 min-h-[78px]">
                        <p className="text-[14px] leading-5 text-[#106FAA]">{card.pill}</p>
                        <h3 className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[20px] font-semibold leading-7 text-[#045E96]">
                          {card.title}
                        </h3>
                      </div>
                      <div className="mb-5 mt-4 h-px bg-slate-200" />

                      <div
                        className={`mt-auto flex items-center ${isLocked ? "justify-start" : "justify-between"}`}
                      >
                        {card.key === "assessment" ? (
                          <span />
                        ) : (
                          <div className="flex items-center gap-2">
                            <CircularProgressRing value={progressPercent} size={28} />
                            <p className="text-base font-semibold text-[#333]">
                              {tLearn("progressPercent", { value: progressPercent })}
                            </p>
                          </div>
                        )}
                        {!isLocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (card.key === "assessment") {
                                setActiveLessonKey("assessment");
                                setActiveSecretKey(null);
                              } else if (card.key === "makingWhole") {
                                setActiveLessonKey("makingWhole");
                                setActiveSecretKey(null);
                              } else {
                                setActiveLessonKey(card.key);
                                setActiveSecretKey(null);
                              }
                            }}
                            className="rounded-full bg-[#045E96] px-6 py-1.5 text-base font-semibold text-[#EDF4FC]"
                          >
                            {tLearn("startLesson")}
                          </button>
                        ) : null}
                      </div>

                      {isLocked ? (
                        <>
                          <div
                            className="pointer-events-none absolute inset-0 z-10 rounded-[24px] bg-black/40 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                            aria-hidden
                          />
                          <div className="pointer-events-none absolute right-3 top-3 z-20">
                            <Image
                              src="/learning/lock.svg"
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8 object-contain drop-shadow-sm"
                            />
                          </div>
                        </>
                      ) : null}
                    </article>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <UnlockCourseDialog
        open={showUnlockCourseDialog}
        onClose={() => setShowUnlockCourseDialog(false)}
      />
    </div>
  );
}
