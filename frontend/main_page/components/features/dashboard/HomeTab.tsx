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
  const [showStreakRewardDialog, setShowStreakRewardDialog] = useState(false);
  const [streakReward, setStreakReward] = useState({ streak: 7, coins: 200, diamonds: 0 });
  const [streakDateRange, setStreakDateRange] = useState("");
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const totalPoints = coins + diamonds * 10 + flowers * 3;
  const expPerLevel = 120;
  const level = Math.max(1, Math.floor(totalPoints / expPerLevel) + 1);

  const handleCheckIn = async () => {
    const result = await doCheckIn();
    if (!result || result.coins < 200) return;

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const toMonthDay = (d: Date) => `${d.getMonth() + 1}. ${d.getDate()}`;

    setStreakReward({
      streak: Math.max(7, result.streakAfter),
      coins: result.coins,
      diamonds: result.diamonds,
    });
    setStreakDateRange(`${toMonthDay(start)} - ${toMonthDay(end)}`);
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
              isHomesteadMenuOpen ? "pb-[clamp(16rem,38vw,20rem)] sm:pb-[clamp(14rem,28vw,16.25rem)]" : ""
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
            <div className="relative z-20 mt-3 flex flex-wrap items-center justify-between gap-3">
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

      {showStreakRewardDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="streak reward"
          onClick={() => setShowStreakRewardDialog(false)}
        >
          <div
            className="relative w-full max-w-[500px] rounded-3xl bg-white p-8 shadow-[0px_20px_30px_0px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowStreakRewardDialog(false)}
              className="absolute right-6 top-6 inline-flex h-6 w-6 items-center justify-center text-[#045E96] hover:opacity-70"
              aria-label="close"
            >
              <span className="text-xl leading-none">×</span>
            </button>

            <div className="mb-8 flex flex-col items-center text-center">
              <Image src="/dashboard/Fire.svg" alt="streak" width={80} height={80} className="mb-4 h-20 w-20" />
              <h3 className="text-[#106FAA] text-3xl font-semibold font-['Outfit'] leading-10">
                {streakReward.streak} Day Streak!
              </h3>
              <p className="mt-2 text-[#106FAA] text-lg font-normal font-['Outfit'] leading-7">
                Keep it up! You&apos;re doing amazing!
              </p>
            </div>

            <div className="mb-6 rounded-2xl bg-sky-50 px-6 py-6">
              <div className="mb-4 text-center text-[#106FAA] text-base font-medium font-['Outfit'] leading-6">
                {streakDateRange || "Weekly Progress"}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekLabels.map((label) => (
                  <div key={label} className="rounded-xl bg-blue-100 p-2">
                    <div className="mb-2 text-center text-xs font-medium font-['Outfit'] leading-4 text-[#106FAA]">
                      {label}
                    </div>
                    <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-normal text-white">
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-2xl border-2 border-amber-400/30 bg-orange-50 p-5">
              <div className="mb-3 text-[#106FAA] text-sm font-medium font-['Outfit'] leading-5">Today&apos;s Reward</div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Image src="/dashboard/coin.svg" alt="coins" width={40} height={40} className="h-10 w-10" />
                  <div className="text-amber-400 text-1xl font-semibold font-['Outfit'] leading-8">
                    +{streakReward.coins} Coins
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Image src="/dashboard/dimond.svg" alt="diamonds" width={40} height={40} className="h-10 w-10" />
                  <div className="text-amber-400 text-1xl font-semibold font-['Outfit'] leading-8">
                    +{streakReward.diamonds} Diamonds
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStreakRewardDialog(false)}
              className="w-full rounded-[100px] bg-[#E45C44] py-4 text-lg font-semibold font-['Outfit'] leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] hover:opacity-95"
            >
              Claim Reward
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
