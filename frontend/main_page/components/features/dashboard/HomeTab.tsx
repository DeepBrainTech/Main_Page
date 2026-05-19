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
  avatarUrl?: string | null;
}

type HomesteadCustomizeTab = "head" | "body" | "hand" | "background";
type WeeklyProgressDay = {
  label: string;
  dateKey: string;
  signed: boolean;
  isFuture: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthDay(date: Date) {
  return `${date.getMonth() + 1}. ${date.getDate()}`;
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const mondayOffset = (date.getDay() + 6) % 7;
  weekStart.setDate(date.getDate() - mondayOffset);
  return weekStart;
}

function getCurrentWeekProgress(signedDates: string[], today = new Date()): WeeklyProgressDay[] {
  const signedDateSet = new Set(signedDates);
  const todayKey = formatLocalDateKey(today);
  const weekStart = getWeekStart(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = formatLocalDateKey(date);

    return {
      label: WEEKDAY_LABELS[date.getDay()],
      dateKey,
      signed: signedDateSet.has(dateKey),
      isFuture: dateKey > todayKey,
    };
  });
}

/**
 * Dashboard home content: KPI + stage + check-in/tasks + brainpower panel
 */
export default function HomeTab({ username = "", avatarUrl = null }: HomeTabProps) {
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
  const [streakReward, setStreakReward] = useState({
    streak: 0,
    coins: 0,
    membershipBonusPlan: null as "plus" | "premium" | null,
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
    setStreakDateRange(`${toMonthDay(weekStart)} - ${toMonthDay(weekEnd)}`);
    setWeeklyProgressDays(getCurrentWeekProgress(nextSignedDates, today));
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
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium leading-5 font-app-body transition-colors"
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
              <h3 className="text-[#106FAA] text-3xl font-semibold font-app-body leading-10">
                {streakReward.streak >= 7 ? `${streakReward.streak} Day Streak!` : tHome("checkInTitle")}
              </h3>
              <p className="mt-2 text-[#106FAA] text-lg font-normal font-app-body leading-7">
                Keep it up! You&apos;re doing amazing! 🎉
              </p>
            </div>

            <div className="mb-6 rounded-2xl bg-sky-50 px-6 py-6">
              <div className="mb-4 text-center text-[#106FAA] text-base font-medium font-app-body leading-6">
                {streakDateRange || "Weekly Progress"}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weeklyProgressDays.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`flex flex-col items-center rounded-xl p-2 ${
                      day.signed ? "bg-blue-100" : day.isFuture ? "bg-slate-50" : "bg-slate-100"
                    }`}
                  >
                    <div
                      className={`mb-2 w-full text-center text-xs font-medium font-app-body leading-4 ${
                        day.isFuture && !day.signed ? "text-[#106FAA]/60" : "text-[#106FAA]"
                      }`}
                    >
                      {day.label}
                    </div>
                    {day.signed ? (
                      <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4CAF50]">
                        <span className="inline-flex h-full w-full translate-x-[0px] translate-y-[0px] items-center justify-center font-['Inter'] text-sm font-normal leading-none text-white">
                          ✓
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white ${
                          day.isFuture ? "border-slate-200" : "border-slate-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 inline-flex min-h-24 w-full items-center justify-start gap-4 rounded-2xl bg-orange-50 p-5 outline outline-2 outline-offset-[-2px] outline-amber-400/30">
              <div className="relative size-16 shrink-0 overflow-hidden">
                <Image src="/checkin/coin.svg" alt="coins" width={64} height={64} className="h-16 w-16 object-contain" />
              </div>
              <div className="inline-flex min-w-0 flex-1 flex-col items-start justify-start gap-1">
                <div className="self-stretch text-sm font-medium font-['Outfit'] leading-5 text-sky-700">
                  {tHome("todaysReward")}
                </div>
                <div className="self-stretch break-words text-xl font-semibold font-['Outfit'] leading-8 text-amber-400">
                  {[
                    `+${streakReward.coins} Coins`,
                    streakReward.diamonds > 0 ? `+${streakReward.diamonds} Diamonds` : null,
                    streakReward.flowers > 0 ? `+${streakReward.flowers} Flowers` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </div>
              </div>
            </div>

            {streakReward.membershipBonusPlan ? (
              <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#106FAA]/50 to-[#0075FF]/50 p-0.5">
                <div className="inline-flex min-h-24 w-full items-center justify-start gap-4 rounded-[14px] bg-indigo-50 p-5">
                  <div className="relative size-16 shrink-0">
                    <Image src="/checkin/diamond.svg" alt="membership bonus" width={64} height={64} className="h-16 w-16 object-contain" />
                  </div>
                  <div className="inline-flex min-w-0 flex-1 flex-col items-start justify-start gap-1">
                    <div className="self-stretch">
                      <Image
                        src={
                          streakReward.membershipBonusPlan === "premium"
                            ? "/checkin/PREMIUM_Bonus.svg"
                            : "/checkin/PLUS_Bonus.svg"
                        }
                        alt={streakReward.membershipBonusPlan === "premium" ? "Premium Bonus" : "PLUS Bonus"}
                        width={112}
                        height={20}
                        className="h-4-auto object-contain"
                      />
                    </div>
                    <div className="self-stretch break-words text-xl font-semibold font-['Outfit'] leading-8 text-[#2478DC]">
                      {[
                        streakReward.membershipBonusDiamonds > 0 ? `+${streakReward.membershipBonusDiamonds} Diamonds` : null,
                        streakReward.membershipBonusCoins > 0 ? `+${streakReward.membershipBonusCoins} Coins` : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowStreakRewardDialog(false)}
              className="w-full rounded-[100px] bg-[#E45C44] py-4 text-lg font-semibold font-app-body leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] hover:opacity-95"
            >
              Claim Reward
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
