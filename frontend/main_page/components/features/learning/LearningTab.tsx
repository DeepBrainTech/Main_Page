"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import MentalMathAssessmentPanel from "@/components/features/learning/MentalMathAssessmentPanel";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const badgePlaceholders = ["Number Igniter", "Focus Pilot", "Logic Explorer"];
const completedMonthCount = 4;
const chartMinPercent = 25;
const chartMaxPercent = 100;
const chartMinHeightPx = 30;
const chartMaxHeightPx = 124;

const lessonCards = [
  { key: "assessment", label: "Quiz", title: "Lesson 0: Self-Assessment", status: "free" as const, locked: false },
  { key: "makingWhole", label: "Course", title: "Lesson 1: Making Whole", status: "free" as const, locked: false },
  { key: "breakIntoParts", label: "Course", title: "Lesson 2: Break into Parts", status: "locked" as const, locked: true },
  { key: "rearrange", label: "Quiz", title: "Lesson 3: Rearrange", status: "limited" as const, locked: false },
  { key: "roundAdjust", label: "Course", title: "Lesson 4: Round & Adjust", status: "full" as const, locked: false },
];

function createWeeklyProgressData() {
  let seed = 42;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return months.map((month, monthIndex) => ({
    month,
    weeklyProgress: Array.from({ length: 4 }, () => {
      if (monthIndex >= completedMonthCount) {
        return 72;
      }
      return Math.round(chartMinPercent + nextRandom() * (chartMaxPercent - chartMinPercent));
    }),
  }));
}

export default function LearningTab() {
  const weeklyProgressByMonth = useMemo(() => createWeeklyProgressData(), []);
  const [showLessonBoard, setShowLessonBoard] = useState(false);
  const [activeLessonKey, setActiveLessonKey] = useState<string | null>(null);

  const toBarHeight = (percent: number) => {
    const clamped = Math.min(chartMaxPercent, Math.max(chartMinPercent, percent));
    const ratio = (clamped - chartMinPercent) / (chartMaxPercent - chartMinPercent);
    return Math.round(chartMinHeightPx + ratio * (chartMaxHeightPx - chartMinHeightPx));
  };

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 pb-10 font-['Outfit'] xl:grid-cols-12 xl:grid-rows-[auto_1fr]">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:col-span-8 xl:row-start-1">
        {[
          { title: "Completed", value: "14%", icon: "◎" },
          { title: "Lessons", value: "1/10", icon: "📘" },
          { title: "Hours", value: "11", icon: "🕒" },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[20px] border border-white/70 bg-white/70 p-5 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#106FAA]">{item.title}</h3>
              <span className="text-lg text-[#106FAA]">{item.icon}</span>
            </div>
            <p className="mt-6 text-left font-['Titan_One'] text-3xl text-[#045E96]">{item.value}</p>
          </article>
        ))}
      </section>

      <aside className="space-y-5 rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md xl:col-span-4 xl:row-span-2 xl:row-start-1 xl:h-full xl:min-h-[760px]">
        <section>
          <h2 className="font-['Titan_One'] text-3xl text-[#045E96]">Study Track</h2>
          <div className="mt-4 rounded-[24px] bg-[#E4F2F9] p-5">
            <h3 className="text-base font-semibold text-[#106FAA]">Learning Progress</h3>
            <div className="mt-4 h-[168px]">
              <div className="flex h-[124px] items-end gap-1">
                {weeklyProgressByMonth.flatMap(({ month, weeklyProgress }, monthIndex) =>
                  weeklyProgress.map((progressPercent, weekIndex) => (
                    <div
                      key={`${month}-${weekIndex}`}
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
                {months.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-['Titan_One'] text-3xl text-[#045E96]">Badges</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {badgePlaceholders.map((badgeName) => (
              <div key={badgeName} className="flex flex-col items-center gap-2">
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#D8E8F4] bg-[#F7FBFF] text-2xl">
                  🏅
                </div>
                <p className="text-center text-xs font-medium text-black">{badgeName}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="space-y-3 xl:col-span-8 xl:row-start-2">
        {!showLessonBoard ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#106FAA]">Lessons</h2>
            <article className="rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="overflow-hidden rounded-3xl md:w-[36%]">
                  <Image
                    src="/learning/mental_math/mental_math.png"
                    alt="Mental Math"
                    width={420}
                    height={240}
                    className="h-[190px] w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-['Titan_One'] text-2xl text-[#045E96]">Mental Math</h3>
                  <p className="mt-2 text-sm leading-6 text-[#045E96]">
                    Course Intro Course Intro Course Intro Course Intro Course Intro Course Intro Course Intro.
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#106FAA]">Age 6-12</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm text-[#106FAA]">
                      10 Lessons • 24 Hours
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLessonBoard(true)}
                      className="rounded-full bg-[#045E96] px-5 py-2 text-sm font-semibold text-[#EDF4FC] transition hover:opacity-95"
                    >
                      Start Learning
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
                }}
                className="text-[#8CBBD8] transition hover:text-[#106FAA]"
              >
                Lessons
              </button>
              <span className="mx-2 text-[#8CBBD8]">{">"}</span>
              <span>Mental Maths</span>
            </div>

            {activeLessonKey === "assessment" ? (
              <section className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#045E96]">Lesson 0: Self-Assessment</h3>
                  <button
                    type="button"
                    onClick={() => setActiveLessonKey(null)}
                    className="rounded-full bg-[#EDF4FC] px-4 py-1.5 text-sm font-semibold text-[#045E96]"
                  >
                    Back to Lessons
                  </button>
                </div>
                <MentalMathAssessmentPanel />
              </section>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lessonCards.map((card) => (
                  <article
                    key={card.key}
                    className={`relative flex h-full flex-col rounded-[24px] border border-white/70 p-4 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] ${
                      card.locked ? "overflow-hidden bg-[#7A7A7A]/90" : "bg-white/80"
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-2xl">
                      <Image
                        src="/learning/mental_math/mental_math.png"
                        alt={card.title}
                        width={276}
                        height={100}
                        className={`h-[90px] w-full object-cover ${card.locked ? "brightness-75" : ""}`}
                      />
                      {card.status === "free" && (
                        <span className="absolute right-2 top-2 rounded-md bg-[#4ADE80] px-2 py-0.5 text-sm font-semibold text-white">
                          Free
                        </span>
                      )}
                      {card.status === "limited" && (
                        <span className="absolute right-2 top-2 rounded-md bg-[#FFD773] px-2 py-0.5 text-sm font-semibold text-[#9A6500]">
                          60 Days Left
                        </span>
                      )}
                      {card.status === "full" && (
                        <span className="absolute right-2 top-2 rounded-md bg-[#E6F2FF] px-2 py-0.5 text-sm font-semibold text-[#045E96]">
                          Full Access
                        </span>
                      )}
                      {card.locked && (
                        <span className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                          Locked
                        </span>
                      )}
                    </div>

                    <div className="mt-4 min-h-[78px]">
                      <p className={`text-[14px] leading-5 ${card.locked ? "text-[#CFE7F7]" : "text-[#106FAA]"}`}>{card.label}</p>
                      <h3
                        className={`mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[20px] font-semibold leading-7 ${
                          card.locked ? "text-white" : "text-[#045E96]"
                        }`}
                      >
                        {card.title}
                      </h3>
                    </div>
                    <div className={`mb-5 mt-4 h-px ${card.locked ? "bg-white/20" : "bg-slate-200"}`} />

                    {card.locked ? (
                      <div className="mt-auto space-y-1 text-sm text-white">
                        <p>💎 100 &nbsp; 3-Month Limited Unlock</p>
                        <p>💎 200 &nbsp; Lifetime Unlock</p>
                        <p className="font-semibold text-[#FFD55C]">⭐ Upgrade to Premium</p>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="rounded-full bg-[#D6E9F8] px-5 py-1.5 text-base font-semibold text-[#045E96]"
                          >
                            Unlock
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto flex items-center justify-between">
                        <p className="text-base font-semibold text-[#333]">Progress: 80%</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (card.key === "assessment") {
                              setActiveLessonKey("assessment");
                            }
                          }}
                          className="rounded-full bg-[#045E96] px-6 py-1.5 text-base font-semibold text-[#EDF4FC]"
                        >
                          Start
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
