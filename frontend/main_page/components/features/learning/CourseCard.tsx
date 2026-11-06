"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

type CourseCardProps = {
  title: string;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  hasStarted: boolean;
  saved: boolean;
  onToggleSaved: () => void;
  onStart: () => void;
};

export default function CourseCard({
  title, category, progress, completedLessons, totalLessons, hasStarted,
  saved, onToggleSaved, onStart,
}: CourseCardProps) {
  const t = useTranslations("learning.home");

  return (
    <article className="flex min-w-0 flex-col justify-between gap-12 rounded-2xl bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#045E96] px-3 py-1 text-base font-medium leading-tight text-white">
            {category}
          </span>
          <button
            type="button"
            aria-label={t(saved ? "removeSavedCourse" : "saveCourse", { title })}
            aria-pressed={saved}
            onClick={onToggleSaved}
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-[#FFF1ED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#045E96] ${saved ? "bg-[#FFF1ED]" : "opacity-50 hover:opacity-100"}`}
          >
            <Image src="/learning/course-bookmark.svg" alt="" width={32} height={32} />
          </button>
        </div>
        <h3 className="break-words text-2xl font-medium leading-snug text-[#333]">{title}</h3>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-base text-[#333]/60">
            <span>{t("courseProgress")}</span>
            <span>{t("courseLessonCount", { completed: completedLessons, total: totalLessons })}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t("courseProgressLabel", { title })}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 overflow-hidden rounded-full bg-[#EDF4FC]"
          >
            <div className="h-full rounded-full bg-[#045E96] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onStart}
            className="min-h-10 rounded-full bg-[#045E96] px-6 py-2 text-base font-semibold text-[#EDF4FC] transition hover:bg-[#106FAA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#045E96]"
          >
            {t(hasStarted ? "continueLearning" : "startLearning")}
          </button>
        </div>
      </div>
    </article>
  );
}
