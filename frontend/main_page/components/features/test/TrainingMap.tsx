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
  1:  { bg: "from-emerald-400 to-teal-500",    ring: "ring-emerald-300",  text: "text-emerald-700",  connector: "bg-emerald-200" },
  2:  { bg: "from-sky-400 to-blue-500",        ring: "ring-sky-300",      text: "text-sky-700",      connector: "bg-sky-200" },
  3:  { bg: "from-violet-400 to-purple-500",   ring: "ring-violet-300",   text: "text-violet-700",   connector: "bg-violet-200" },
  4:  { bg: "from-amber-400 to-orange-500",    ring: "ring-amber-300",    text: "text-amber-700",    connector: "bg-amber-200" },
  5:  { bg: "from-rose-400 to-pink-500",       ring: "ring-rose-300",     text: "text-rose-700",     connector: "bg-rose-200" },
  6:  { bg: "from-fuchsia-500 to-purple-600",  ring: "ring-fuchsia-300",  text: "text-fuchsia-700",  connector: "bg-fuchsia-200" },
  7:  { bg: "from-slate-600 to-slate-800",     ring: "ring-slate-400",    text: "text-slate-700",    connector: "bg-slate-300" },
};

function getStage(level: number): number {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 15) return 3;
  if (level <= 22) return 4;
  if (level <= 30) return 5;
  if (level <= 40) return 6;
  return 7;
}

function StarRow({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`text-xs ${i < stars ? "text-yellow-400" : "text-slate-300"}`}>
          ★
        </span>
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
        "relative flex flex-col items-center gap-1 w-20 sm:w-24 transition-all duration-200",
        isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer group",
      ].join(" ")}
      aria-label={`Level ${cfg.level}`}
    >
      {/* Node circle */}
      <div
        className={[
          "relative flex items-center justify-center rounded-full font-bold font-app-body transition-all duration-200",
          "w-14 h-14 sm:w-16 sm:h-16 ring-4 shadow-lg",
          isLocked
            ? "bg-slate-200 ring-slate-300 text-slate-400"
            : `bg-gradient-to-br ${colors.bg} ${colors.ring} text-white`,
          isCurrent
            ? "scale-110 shadow-xl ring-[6px] animate-pulse"
            : !isLocked ? "group-hover:scale-105" : "",
        ].join(" ")}
      >
        {isLocked ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        ) : (
          <span className="text-lg sm:text-xl">{cfg.level}</span>
        )}

        {/* Completed check badge */}
        {isCompleted && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow">
            ✓
          </span>
        )}
      </div>

      {/* Stars */}
      {!isLocked && <StarRow stars={stars} />}

      {/* Label */}
      <span
        className={[
          "text-[10px] sm:text-xs font-medium font-app-body text-center leading-tight max-w-[80px] line-clamp-2",
          isLocked ? "text-slate-400" : colors.text,
        ].join(" ")}
      >
        {t(cfg.titleKey as Parameters<typeof t>[0])}
      </span>

      {/* Current arrow indicator */}
      {isCurrent && (
        <span className="absolute -bottom-5 text-sky-500 text-lg animate-bounce">▼</span>
      )}
    </button>
  );
}

const NODES_PER_ROW = 3;

export default function TrainingMap({ progressMap, maxUnlockedLevel, onSelectLevel }: TrainingMapProps) {
  const t = useTranslations("test");
  const currentRef = useRef<HTMLDivElement>(null);

  // Scroll to the current level node on mount
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [maxUnlockedLevel]);

  // Group levels into rows of NODES_PER_ROW, alternating direction (snake path)
  const rows: MapLevelConfig[][] = [];
  for (let i = 0; i < MAP_LEVELS.length; i += NODES_PER_ROW) {
    rows.push(MAP_LEVELS.slice(i, i + NODES_PER_ROW));
  }

  return (
    <div className="w-full font-app-body select-none">
      {/* Header */}
      <div className="mb-6 text-center">
        <p className="text-sm text-slate-500">
          {t("mapProgress", { current: Math.min(maxUnlockedLevel - 1, TOTAL_MAP_LEVELS), total: TOTAL_MAP_LEVELS })}
        </p>
      </div>

      {/* Stage legend */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {[
          { stage: 1, label: t("mapStage1"), levels: "1–5" },
          { stage: 2, label: t("mapStage2"), levels: "6–10" },
          { stage: 3, label: t("mapStage3"), levels: "11–15" },
          { stage: 4, label: t("mapStage4"), levels: "16–22" },
          { stage: 5, label: t("mapStage5"), levels: "23–30" },
          { stage: 6, label: t("mapStage6"), levels: "31–40" },
          { stage: 7, label: t("mapStage7"), levels: "41–50" },
        ].map(({ stage, label, levels }) => {
          const c = STAGE_COLORS[stage];
          return (
            <span
              key={stage}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r ${c.bg} text-white shadow-sm`}
            >
              {label} {levels}
            </span>
          );
        })}
      </div>

      {/* Map path */}
      <div className="flex flex-col items-center gap-0 pb-16">
        {rows.map((row, rowIdx) => {
          // Alternate direction: even rows left→right, odd rows right→left (snake)
          const isReversed = rowIdx % 2 === 1;
          const displayRow = isReversed ? [...row].reverse() : row;

          return (
            <div key={rowIdx} className="w-full max-w-sm">
              {/* Row of nodes */}
              <div className="flex justify-around items-end px-2 py-6">
                {displayRow.map((cfg) => {
                  const stars = progressMap[cfg.level]?.stars ?? 0;
                  const unlocked = cfg.level <= maxUnlockedLevel;
                  const completed = stars >= 1;
                  const isCurrent = cfg.level === maxUnlockedLevel && !completed;

                  let state: NodeState = "locked";
                  if (completed) state = "completed";
                  else if (isCurrent || (unlocked && !completed)) state = "current";

                  return (
                    <div
                      key={cfg.level}
                      ref={state === "current" ? currentRef : undefined}
                    >
                      <LevelNode
                        cfg={cfg}
                        state={state}
                        stars={stars}
                        onClick={() => {
                          if (unlocked) onSelectLevel(cfg);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Connector between rows (vertical zigzag line) */}
              {rowIdx < rows.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className={`w-1 h-8 rounded-full ${STAGE_COLORS[getStage(row[0].level)].connector}`} />
                </div>
              )}
            </div>
          );
        })}

        {/* End of map */}
        <div className="mt-8 flex flex-col items-center gap-2 text-slate-400">
          <span className="text-3xl">🏆</span>
          <span className="text-sm font-medium">{t("mapComplete")}</span>
        </div>
      </div>
    </div>
  );
}
