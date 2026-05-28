"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import HomesteadBlock from "./HomesteadBlock";
import CheckInCalendar from "./CheckInCalendar";
import TaskList from "./TaskList";
import StreakRewardDialog, { type StreakRewardState } from "./StreakRewardDialog";
import { useRewards } from "@/hooks/useRewards";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";
import StatCard from "@/components/features/dashboard/StatCard";
import BrainpowerPanel from "@/components/features/dashboard/BrainpowerPanel";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";
import {
  formatLocalDateKey,
  formatWeekDateRange,
  getCurrentWeekProgress,
  getWeekStart,
  getWeekdayLabels,
  type WeeklyProgressDay,
} from "@/lib/weekProgress";

interface HomeTabProps {
  username?: string;
  avatarUrl?: string | null;
}

type HomesteadCustomizeTab = "head" | "body" | "hand" | "background";

/**
 * Dashboard home content: KPI + stage + check-in/tasks + brainpower panel
 */
export default function HomeTab({ username = "", avatarUrl = null }: HomeTabProps) {
  const tHome = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const weekdayLabels = useMemo(() => getWeekdayLabels(tHome), [tHome]);
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
    playedGameCount,
    claimTaskReward,
  } = useRewards();
  const { scores: radarScores } = useCognitiveScores();
  const [activeHomesteadTab, setActiveHomesteadTab] = useState<HomesteadCustomizeTab | null>(null);
  const [isHomesteadMenuOpen, setIsHomesteadMenuOpen] = useState(false);
  const [showStreakRewardDialog, setShowStreakRewardDialog] = useState(false);
  const [streakReward, setStreakReward] = useState<StreakRewardState>({
    streak: 0,
    coins: 0,
    membershipBonusPlan: null,
    membershipBonusCoins: 0,
    membershipBonusDiamonds: 0,
    diamonds: 0,
    flowers: 0,
  });
  const [streakDateRange, setStreakDateRange] = useState("");
  const [weeklyProgressDays, setWeeklyProgressDays] = useState<WeeklyProgressDay[]>([]);

  const totalPoints = coins + diamonds * 10 + flowers * 3;
  const expPerLevel = 120;
  const level = Math.max(1, Math.floor(totalPoints / expPerLevel) + 1);

  const handleCheckIn = async () => {
    const result = await doCheckIn();
    if (!result) return;

    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const todayKey = formatLocalDateKey(today);
    const nextSignedDates = result.checkInDatesAfter.length
      ? result.checkInDatesAfter
      : Array.from(new Set([...checkIn.dates, todayKey]));

    setStreakReward({
      streak: result.streakAfter,
      coins: result.coins,
      membershipBonusPlan: result.membershipBonusPlan,
      membershipBonusCoins: result.membershipBonusCoins,
      membershipBonusDiamonds: result.membershipBonusDiamonds,
      diamonds: result.diamonds,
      flowers: result.flowers,
    });
    setStreakDateRange(formatWeekDateRange(weekStart, weekEnd, tHome("dateRangeSeparator")));
    setWeeklyProgressDays(getCurrentWeekProgress(nextSignedDates, weekdayLabels, today));
    setShowStreakRewardDialog(true);
  };

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
          iconAlt={tHome("totalPoints")}
          iconBgColor="#D4EAF8"
          title={tHome("totalPoints")}
          value={totalPoints.toLocaleString()}
        />
        <StatCard
          iconSrc="/dashboard/Fire.svg"
          iconAlt={tHome("dayStreak")}
          iconBgColor="#FFF5F5"
          title={tHome("dayStreak")}
          value={`${checkIn.streak} ${tHome("daysUnit")}`}
        />
        <StatCard
          iconSrc="/dashboard/Star.svg"
          iconAlt={tHome("gamesPlayed")}
          iconBgColor="#D4F3E6"
          title={tHome("gamesPlayed")}
          value={playedGameCount.toLocaleString()}
        />
        <StatCard
          iconSrc="/dashboard/level.svg"
          iconAlt={tHome("level")}
          iconBgColor="#FFECD2"
          title={tHome("level")}
          value={String(level)}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <div
            className={`${dashboardCardClass} relative min-h-[clamp(20rem,42svh,31.25rem)] overflow-visible p-4 transition-[padding] duration-300 md:min-h-[clamp(22rem,46svh,31.25rem)] ${
              isHomesteadMenuOpen ? "pb-[clamp(12rem,32svh,20rem)] sm:pb-[clamp(11rem,28svh,16.25rem)]" : ""
            }`}
          >
            <HomesteadBlock
              level={level}
              userAvatarUrl={avatarUrl}
              activeCustomizeTab={activeHomesteadTab}
              menuOpen={isHomesteadMenuOpen}
              onMenuOpenChange={(isOpen) => {
                setIsHomesteadMenuOpen(isOpen);
                if (!isOpen) {
                  setActiveHomesteadTab(null);
                }
              }}
            />
            <div className="relative z-20 mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="font-['Titan_One'] text-2xl font-normal leading-8 tracking-wide text-sky-700">
                {tHome("homesteadCharacterName")}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    {
                      key: "head" as const,
                      iconSrc: "/home-system/head/head.svg",
                      label: tHome("homesteadHead"),
                    },
                    {
                      key: "body" as const,
                      iconSrc: "/home-system/body/body.svg",
                      label: tHome("homesteadBody"),
                    },
                    {
                      key: "hand" as const,
                      iconSrc: "/home-system/hand/hand.svg",
                      label: tHome("homesteadHand"),
                    },
                    {
                      key: "background" as const,
                      iconSrc: "/home-system/background/background.svg",
                      label: tHome("homesteadBackground"),
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = isHomesteadMenuOpen && activeHomesteadTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        if (isHomesteadMenuOpen && activeHomesteadTab === tab.key) {
                          setIsHomesteadMenuOpen(false);
                          setActiveHomesteadTab(null);
                          return;
                        }
                        setActiveHomesteadTab(tab.key);
                        setIsHomesteadMenuOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-app-body text-base font-medium leading-5 transition-colors"
                      style={{
                        backgroundColor: isActive ? "#E45C44" : "#EDF4FC",
                        color: isActive ? "#FFFFFF" : "#045E96",
                      }}
                    >
                      <Image
                        src={tab.iconSrc}
                        alt={tab.label}
                        width={16}
                        height={16}
                        className={`h-4 w-4 ${isActive ? "brightness-0 invert" : ""}`}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <CheckInCalendar
              checkIn={checkIn}
              hasCheckedInToday={hasCheckedInToday}
              onCheckIn={() => {
                void handleCheckIn();
              }}
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

      <StreakRewardDialog
        open={showStreakRewardDialog}
        reward={streakReward}
        dateRange={streakDateRange}
        weeklyProgressDays={weeklyProgressDays}
        onClose={() => setShowStreakRewardDialog(false)}
      />
    </div>
  );
}
