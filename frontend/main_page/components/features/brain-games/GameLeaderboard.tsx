"use client";

import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useGameLeaderboard } from "@/hooks/useGameLeaderboard";
import { useContainedWheelScroll } from "@/hooks/useContainedWheelScroll";
import { useScrollActivity } from "@/hooks/useScrollActivity";
import styles from "@/components/ui/ScrollArea.module.css";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";
import type { GameLeaderboardEntry } from "@/types/gameLeaderboard";

const medalGeometry = [
  { width: "146.92%", height: "213.93%", left: "-23.1%", top: "-51.39%" },
  { width: "151.26%", height: "213.93%", left: "-25.55%", top: "-51.39%" },
  { width: "135.63%", height: "188.7%", left: "-17.35%", top: "-36.36%" },
] as const;

function LeaderboardRow({ entry }: { entry: GameLeaderboardEntry }) {
  const t = useTranslations("gameDetails");
  const podium = entry.rank <= 3;
  const name = entry.is_current_user ? t("leaderboardYou") : entry.username || t("leaderboardPlayer", { rank: entry.rank });
  return (
    <li aria-current={entry.is_current_user ? "true" : undefined}
      className={`flex min-h-14 items-center gap-3 rounded-xl p-3 ${entry.is_current_user ? "bg-[#E45C44] text-white" : podium ? "bg-gradient-to-r from-[#FFF3D2] to-[#FEF9E7] text-[#333333]" : "bg-[#F5F9FC] text-[#333333]"}`}>
      {podium ? (
        <span className={`relative block h-[2.0625rem] shrink-0 overflow-hidden ${entry.rank === 1 ? "w-8" : "w-[1.9375rem]"}`}>
          <Image src={`/game-details/LeaderboardMedal${entry.rank}.png`} alt={t("leaderboardRank", { rank: entry.rank })}
            width={64} height={96} className="absolute max-w-none" style={medalGeometry[entry.rank - 1]} />
        </span>
      ) : (
        <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#EDF4FC] px-1 text-sm font-bold text-[#045E96]">
          <span className="sr-only">{t("leaderboardRank", { rank: entry.rank })}</span>
          <span aria-hidden="true">{entry.rank}</span>
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-medium" title={entry.username || name}>{name}</span>
      <span className={`shrink-0 whitespace-nowrap font-bold tabular-nums ${entry.is_current_user ? "text-white" : "text-[#0075FF]"}`}>
        {t("leaderboardLevels", { count: entry.completed_levels })}
      </span>
    </li>
  );
}

export default function GameLeaderboard({ gameKey }: { gameKey: string }) {
  const t = useTranslations("gameDetails");
  const { data, loading, error, supported, retry } = useGameLeaderboard(gameKey);
  const scrollRef = useRef<HTMLDivElement>(null);
  useContainedWheelScroll(scrollRef, Boolean(data?.entries.length));
  const { isScrolling, handleScroll } = useScrollActivity(Boolean(data?.entries.length));
  return (
    <aside className={`${dashboardCardClass} flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] p-6 font-app-body sm:p-8 xl:absolute xl:inset-x-0 xl:top-0 xl:max-h-full`} aria-labelledby="game-leaderboard-title" aria-busy={loading}>
      <h2 id="game-leaderboard-title" className="flex shrink-0 items-center gap-2.5 font-['Titan_One'] text-2xl leading-8 tracking-wide">
        <span className="relative block h-8 w-[2.0625rem] shrink-0 overflow-hidden">
          <Image src="/game-details/LeaderboardTrophy.png" alt="" width={67} height={66} className="absolute max-w-none"
            style={{ width: "201.97%", height: "206.04%", left: "-50.69%", top: "-50.3%" }} />
        </span>
        {t("leaderboard")}
      </h2>
      {!supported ? <p className="mt-5 text-sm leading-6 text-[#66758D]">{t("leaderboardEmpty")}</p> : loading ? (
        <p role="status" className="mt-5 animate-pulse text-sm leading-6 text-[#66758D]">{t("leaderboardLoading")}</p>
      ) : error && !data ? (
        <div role="status" className="mt-5 text-sm leading-6">
          <p className="text-[#66758D]">{t("leaderboardError")}</p>
          <button type="button" onClick={retry} className="mt-3 rounded-full bg-[#EDF4FC] px-5 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">{t("retry")}</button>
        </div>
      ) : data?.entries.length ? (
        <div ref={scrollRef} role="region" tabIndex={0} aria-label={t("leaderboardCompleted")}
          data-scrolling={isScrolling} onScroll={handleScroll}
          className={`${styles.scrollArea} mt-5 min-h-0 max-h-[39.5rem] touch-pan-y overflow-y-auto overscroll-contain rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2`}>
          <ol className="space-y-2">
            {data.entries.map((entry) => <LeaderboardRow key={entry.user_id} entry={entry} />)}
          </ol>
        </div>
      ) : <p role="status" className="mt-5 text-sm leading-6 text-[#66758D]">{t("leaderboardNoEntries")}</p>}
    </aside>
  );
}
