"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import HomesteadBlock from "./HomesteadBlock";
import CheckInCalendar from "./CheckInCalendar";
import TaskList from "./TaskList";
import { useRewards } from "@/hooks/useRewards";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";
import StatCard from "@/components/features/dashboard/StatCard";
import BrainpowerPanel from "@/components/features/dashboard/BrainpowerPanel";

interface HomeTabProps {
  username?: string;
}

/**
 * Dashboard home content: KPI + stage + check-in/tasks + brainpower panel
 */
export default function HomeTab({ username = "" }: HomeTabProps) {
  const tHome = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const {
    loading: rewardsLoading,
    coins,
    diamonds,
    flowers,
    checkIn,
    hasCheckedInToday,
    doCheckIn,
    dailyProgress,
    monthlyProgress,
    monthlyTarget,
    taskClaimedToday,
    monthlyClaimed,
    claimTaskReward,
    refresh,
  } = useRewards();
  const { scores: radarScores } = useCognitiveScores();

  const totalPoints = coins + diamonds * 10 + flowers * 3;
  const expPerLevel = 120;
  const level = Math.max(1, Math.floor(totalPoints / expPerLevel) + 1);
  const expCurrent = totalPoints % expPerLevel;
  const expTarget = expPerLevel;

  const gamesPlayed = useMemo(
    () =>
      Object.values(dailyProgress).reduce((sum, value) => sum + value, 0) +
      (monthlyProgress.month === new Date().toISOString().slice(0, 7) ? monthlyProgress.count : 0),
    [dailyProgress, monthlyProgress]
  );

  if (rewardsLoading) {
    return (
      <div className="flex justify-center py-14">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          <p className="text-sm text-slate-500">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          iconSrc="/dashboard/Cup.svg"
          iconAlt="Total Points"
          iconBgColor="#D4EAF8"
          title={tHome("totalPoints")}
          value={totalPoints.toLocaleString()}
        />
        <StatCard
          iconSrc="/dashboard/Fire.svg"
          iconAlt="Day Streak"
          iconBgColor="#FFF5F5"
          title={tHome("dayStreak")}
          value={`${checkIn.streak} ${tHome("daysUnit")}`}
        />
        <StatCard
          iconSrc="/dashboard/Star.svg"
          iconAlt="Games Played"
          iconBgColor="#D4F3E6"
          title={tHome("gamesPlayed")}
          value={gamesPlayed.toLocaleString()}
        />
        <StatCard
          iconSrc="/dashboard/level.svg"
          iconAlt="Level"
          iconBgColor="#FFECD2"
          title={tHome("level")}
          value={String(level)}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <div className="rounded-3xl border border-white/70 bg-white/65 p-4 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-sky-800">GoodCool</h2>
                <p className="text-sm text-slate-600">{tHome("goodCoolIntro", { username })}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                {tHome("goodCoolChatHint")}
              </div>
            </div>
            <HomesteadBlock
              coins={coins}
              diamonds={diamonds}
              flowers={flowers}
              level={level}
              expCurrent={expCurrent}
              expTarget={expTarget}
              onAssetsChanged={refresh}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CheckInCalendar
              checkIn={checkIn}
              hasCheckedInToday={hasCheckedInToday}
              onCheckIn={doCheckIn}
            />
            <TaskList
              dailyProgress={dailyProgress}
              monthlyProgress={monthlyProgress}
              monthlyTarget={monthlyTarget}
              taskClaimedToday={taskClaimedToday}
              monthlyClaimed={monthlyClaimed}
              onClaimTask={claimTaskReward}
            />
          </div>
        </div>

        <div className="xl:col-span-4">
          <BrainpowerPanel scores={radarScores} />
        </div>
      </section>
    </div>
  );
}
