"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CourseCard from "./CourseCard";
import StudyTools from "./StudyTools";
import { LEARNING_CATEGORIES, LEARNING_COURSES } from "@/config/learningCourses";
import { useUrlFilter } from "@/hooks/useUrlFilter";

const SAVED_COURSES_KEY = "learning.savedCourses";

type LearningCourseHomeProps = {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  hasStarted: boolean;
  onOpenCourse: () => void;
};

export default function LearningCourseHome({ onOpenCourse, ...progress }: LearningCourseHomeProps) {
  const t = useTranslations("learning.home");
  const [category, setCategory] = useUrlFilter("category", LEARNING_CATEGORIES, "all");
  const [savedCourses, setSavedCourses] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(SAVED_COURSES_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        setSavedCourses(stored.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      // Favorites remain available in memory when browser storage is unavailable.
    }
  }, []);

  const toggleSaved = (courseId: string) => {
    const next = savedCourses.includes(courseId)
      ? savedCourses.filter((id) => id !== courseId)
      : [...savedCourses, courseId];
    setSavedCourses(next);
    try {
      localStorage.setItem(SAVED_COURSES_KEY, JSON.stringify(next));
    } catch {
      // A storage failure must not prevent browsing or opening a course.
    }
  };

  const courses = LEARNING_COURSES.filter((course) => category === "all" || course.category === category);

  return (
    <div className="w-full space-y-10 pb-10 font-app-body">
      <section aria-labelledby="learning-courses-heading" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="learning-courses-heading" className="text-3xl font-medium text-[#106FAA] lg:text-4xl">{t("coursesHeading")}</h2>
          <div role="group" aria-label={t("courseCategoriesLabel")} className="flex flex-wrap gap-3">
            {LEARNING_CATEGORIES.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
                className={`min-h-10 rounded-xl border border-[#045E96] px-5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#045E96] ${category === id ? "bg-[#045E96] text-white" : "text-[#045E96] hover:bg-[#EDF4FC]"}`}
              >
                {t(`courseCategories.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={t(course.titleKey)}
              category={t(`courseCategories.${course.category}`)}
              {...progress}
              saved={savedCourses.includes(course.id)}
              onToggleSaved={() => toggleSaved(course.id)}
              onStart={onOpenCourse}
            />
          ))}
          {courses.length === 0 ? (
            <p role="status" className="col-span-full rounded-2xl border border-white/70 bg-white/60 px-6 py-10 text-center text-[#333]/60">{t("noCourses")}</p>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="learning-books-heading" className="space-y-6 xl:col-span-2">
          <h2 id="learning-books-heading" className="text-3xl font-medium text-[#106FAA] lg:text-4xl">{t("booksHeading")}</h2>
          <div className="rounded-2xl border border-dashed border-[#A6C4D7] bg-white/40 px-6 py-8 text-center text-[#333]/60">{t("resourcesComingSoon")}</div>
        </section>
        <StudyTools />
      </div>
    </div>
  );
}
