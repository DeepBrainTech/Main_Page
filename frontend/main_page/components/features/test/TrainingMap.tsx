"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MAP_LEVELS, TOTAL_MAP_LEVELS, type MapLevelConfig } from "@/config/mapLevels";
import type { MapProgressMap } from "@/services/mapProgressApi";

interface TrainingMapProps {
  progressMap: MapProgressMap;
  maxUnlockedLevel: number;
  onSelectLevel: (level: MapLevelConfig) => void;
}

const STAGE_COLORS: Record<number, { bg: string; ring: string; text: string; connector: string }> = {
  1: { bg: "from-emerald-400 to-teal-500", ring: "ring-emerald-300", text: "text-emerald-700", connector: "bg-emerald-200" },
  2: { bg: "from-sky-400 to-blue-500", ring: "ring-sky-300", text: "text-sky-700", connector: "bg-sky-200" },
  3: { bg: "from-violet-400 to-purple-500", ring: "ring-violet-300", text: "text-violet-700", connector: "bg-violet-200" },
  4: { bg: "from-amber-400 to-orange-500", ring: "ring-amber-300", text: "text-amber-700", connector: "bg-amber-200" },
  5: { bg: "from-rose-400 to-pink-500", ring: "ring-rose-300", text: "text-rose-700", connector: "bg-rose-200" },
  6: { bg: "from-fuchsia-500 to-purple-600", ring: "ring-fuchsia-300", text: "text-fuchsia-700", connector: "bg-fuchsia-200" },
  7: { bg: "from-slate-600 to-slate-800", ring: "ring-slate-400", text: "text-slate-700", connector: "bg-slate-300" },
  8: { bg: "from-cyan-500 to-indigo-600", ring: "ring-cyan-300", text: "text-cyan-700", connector: "bg-cyan-200" },
  9: { bg: "from-zinc-700 to-black", ring: "ring-zinc-400", text: "text-zinc-700", connector: "bg-zinc-300" },
};

function getStage(level: number): number {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 15) return 3;
  if (level <= 22) return 4;
  if (level <= 30) return 5;
  if (level <= 40) return 6;
  if (level <= 50) return 7;
  if (level <= 60) return 8;
  return 9;
}

function StarRow({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <div className="flex justify-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`h-3 w-3 ${i < stars ? "text-yellow-400" : "text-slate-300"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

type NodeState = "completed" | "current" | "locked";

function LevelNode({
  cfg,
  state,
  stars,
  onClick,
}: {
  cfg: MapLevelConfig;
  state: NodeState;
  stars: number;
  onClick: () => void;
}) {
  const t = useTranslations("test");
  const stage = getStage(cfg.level);
  const colors = STAGE_COLORS[stage];

  const isCompleted = state === "completed";
  const isCurrent = state === "current";
  const isLocked = state === "locked";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={[
        "relative flex w-20 flex-col items-center gap-1 transition-all duration-200 sm:w-24",
        isLocked ? "cursor-not-allowed opacity-40" : "group cursor-pointer",
      ].join(" ")}
      aria-label={`Level ${cfg.level}`}
    >
      <div
        className={[
          "relative flex items-center justify-center rounded-full font-app-body font-bold transition-all duration-200",
          "h-14 w-14 shadow-lg ring-4 sm:h-16 sm:w-16",
          isLocked
            ? "bg-slate-200 text-slate-400 ring-slate-300"
            : `bg-gradient-to-br ${colors.bg} ${colors.ring} text-white`,
          isCurrent ? "scale-110 animate-pulse shadow-xl ring-[6px]" : !isLocked ? "group-hover:scale-105" : "",
        ].join(" ")}
      >
        {isLocked ? (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z" />
          </svg>
        ) : (
          <span className="text-lg sm:text-xl">{cfg.level}</span>
        )}

        {isCompleted && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-white shadow">
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M4 10.5 8 14l8-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {!isLocked && <StarRow stars={stars} />}

      <span
        className={[
          "line-clamp-2 max-w-[80px] text-center font-app-body text-[10px] font-medium leading-tight sm:text-xs",
          isLocked ? "text-slate-400" : colors.text,
        ].join(" ")}
      >
        {t(cfg.titleKey as Parameters<typeof t>[0])}
      </span>

      {isCurrent && (
        <span className="absolute -bottom-5 animate-bounce text-sky-500" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
            <path d="M10 15 4 7h12l-6 8z" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default function TrainingMap({ progressMap, maxUnlockedLevel, onSelectLevel }: TrainingMapProps) {
  const t = useTranslations("test");
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const currentEl = currentRef.current;
    if (!scrollEl || !currentEl) return;

    const currentCenter = currentEl.offsetLeft + currentEl.offsetWidth / 2;
    const targetLeft = Math.max(0, currentCenter - scrollEl.clientWidth / 2);
    scrollEl.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [maxUnlockedLevel, progressMap]);

  return (
    <div className="w-full select-none font-app-body">
      <div className="mb-6 text-center">
        <p className="text-sm text-slate-500">
          {t("mapProgress", { current: Math.min(maxUnlockedLevel - 1, TOTAL_MAP_LEVELS), total: TOTAL_MAP_LEVELS })}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {[
          { stage: 1, label: t("mapStage1"), levels: "1-5" },
          { stage: 2, label: t("mapStage2"), levels: "6-10" },
          { stage: 3, label: t("mapStage3"), levels: "11-15" },
          { stage: 4, label: t("mapStage4"), levels: "16-22" },
          { stage: 5, label: t("mapStage5"), levels: "23-30" },
          { stage: 6, label: t("mapStage6"), levels: "31-40" },
          { stage: 7, label: t("mapStage7"), levels: "41-50" },
          { stage: 8, label: t("mapStage8"), levels: "51-60" },
          { stage: 9, label: t("mapStage9"), levels: "61-72" },
        ].map(({ stage, label, levels }) => {
          const c = STAGE_COLORS[stage];
          return (
            <span
              key={stage}
              className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ${c.bg}`}
            >
              {label} {levels}
            </span>
          );
        })}
      </div>

      <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain pb-8">
        <div className="flex min-w-max items-start px-4 py-8">
          {MAP_LEVELS.map((cfg, index) => {
            const stars = progressMap[cfg.level]?.stars ?? 0;
            const unlocked = cfg.level <= maxUnlockedLevel;
            const completed = stars >= 1;
            const isCurrent = cfg.level === maxUnlockedLevel && !completed;

            let state: NodeState = "locked";
            if (completed) state = "completed";
            else if (isCurrent || (unlocked && !completed)) state = "current";

            return (
              <div key={cfg.level} className="flex items-start">
                <div ref={state === "current" ? currentRef : undefined} className="shrink-0">
                  <LevelNode
                    cfg={cfg}
                    state={state}
                    stars={stars}
                    onClick={() => {
                      if (unlocked) onSelectLevel(cfg);
                    }}
                  />
                </div>
                {index < MAP_LEVELS.length - 1 && (
                  <div className="flex h-16 w-12 shrink-0 items-center px-2 sm:w-16">
                    <div className={`h-1 w-full rounded-full ${STAGE_COLORS[getStage(cfg.level)].connector}`} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex h-24 w-28 shrink-0 flex-col items-center justify-center gap-2 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-yellow-400" fill="currentColor" aria-hidden="true">
              <path d="M7 4V2h10v2h4v3a6 6 0 0 1-5.02 5.92A4.99 4.99 0 0 1 13 15.9V19h3v2H8v-2h3v-3.1a4.99 4.99 0 0 1-2.98-2.98A6 6 0 0 1 3 7V4h4Zm0 2H5v1a4 4 0 0 0 2.12 3.53A5.15 5.15 0 0 1 7 9.5V6Zm10 0v3.5c0 .35-.04.69-.11 1.02A4 4 0 0 0 19 7V6h-2Z" />
            </svg>
            <span className="text-center text-sm font-medium">{t("mapComplete")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
