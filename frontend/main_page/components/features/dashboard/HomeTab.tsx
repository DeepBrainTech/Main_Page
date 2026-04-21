"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
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

type HomesteadCustomizeTab = "head" | "body" | "hand" | "background";

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
    playedGameCount,
    claimTaskReward,
  } = useRewards();
  const { scores: radarScores } = useCognitiveScores();
  const [activeHomesteadTab, setActiveHomesteadTab] = useState<HomesteadCustomizeTab | null>(null);
  const [isHomesteadMenuOpen, setIsHomesteadMenuOpen] = useState(false);

  const totalPoints = coins + diamonds * 10 + flowers * 3;
  const expPerLevel = 120;
  const level = Math.max(1, Math.floor(totalPoints / expPerLevel) + 1);

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
          value={playedGameCount.toLocaleString()}
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
          <div
            className={`relative min-h-[360px] overflow-visible rounded-3xl border border-white/70 bg-white p-4 shadow-lg backdrop-blur transition-[padding] duration-300 md:min-h-[430px] xl:min-h-[500px] ${
              isHomesteadMenuOpen ? "pb-[230px]" : ""
            }`}
          >
            <HomesteadBlock
              level={level}
              activeCustomizeTab={activeHomesteadTab}
              menuOpen={isHomesteadMenuOpen}
              onMenuOpenChange={(isOpen) => {
                setIsHomesteadMenuOpen(isOpen);
                if (!isOpen) {
                  setActiveHomesteadTab(null);
                }
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="font-['Titan_One'] text-2xl font-normal leading-8 tracking-wide text-sky-700">
                {tHome("homesteadCharacterName")}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
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
                ].map((tab) => {
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
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium leading-5 font-['Outfit'] transition-colors"
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
