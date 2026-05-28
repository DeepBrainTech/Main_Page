"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { WeeklyProgressDay } from "@/lib/weekProgress";

export interface StreakRewardState {
  streak: number;
  coins: number;
  membershipBonusPlan: "plus" | "premium" | null;
  membershipBonusCoins: number;
  membershipBonusDiamonds: number;
  diamonds: number;
  flowers: number;
}

interface StreakRewardDialogProps {
  open: boolean;
  reward: StreakRewardState;
  dateRange: string;
  weeklyProgressDays: WeeklyProgressDay[];
  onClose: () => void;
}

export default function StreakRewardDialog({
  open,
  reward,
  dateRange,
  weeklyProgressDays,
  onClose,
}: StreakRewardDialogProps) {
  const tHome = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [dialogScale, setDialogScale] = useState(1);

  const updateDialogScale = useCallback(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const unscaledWidth = rect.width / dialogScale;
    const unscaledHeight = rect.height / dialogScale;
    const availableWidth = window.innerWidth - 32;
    const availableHeight = window.innerHeight - 32;
    const nextScale = Math.min(1, availableWidth / unscaledWidth, availableHeight / unscaledHeight);

    setDialogScale(Number.isFinite(nextScale) ? nextScale : 1);
  }, [dialogScale]);

  useLayoutEffect(() => {
    if (!open) {
      setDialogScale(1);
      return;
    }

    updateDialogScale();

    const observer = new ResizeObserver(updateDialogScale);
    const dialog = dialogRef.current;

    if (dialog) {
      observer.observe(dialog);
    }

    window.addEventListener("resize", updateDialogScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDialogScale);
    };
  }, [open, updateDialogScale]);

  if (!open) {
    return null;
  }

  const baseCoinReward = Math.min(reward.coins, 50);
  const weeklyBonusCoins =
    reward.streak > 0 && reward.streak % 7 === 0 ? Math.max(0, reward.coins - baseCoinReward) : 0;
  const coinRewardParts = [
    baseCoinReward > 0 ? tHome("rewardCoins", { count: baseCoinReward }) : null,
    weeklyBonusCoins > 0 ? tHome("rewardCoinsWeeklyBonus", { count: weeklyBonusCoins }) : null,
  ].filter(Boolean);
  const extraRewardParts = [
    reward.diamonds > 0 ? tHome("rewardDiamonds", { count: reward.diamonds }) : null,
    reward.flowers > 0 ? tHome("rewardFlowers", { count: reward.flowers }) : null,
  ].filter(Boolean);

  const membershipBonusParts = [
    reward.membershipBonusDiamonds > 0
      ? tHome("rewardDiamonds", { count: reward.membershipBonusDiamonds })
      : null,
    reward.membershipBonusCoins > 0 ? tHome("rewardCoins", { count: reward.membershipBonusCoins }) : null,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tHome("streakDialogAria")}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-[500px] origin-center rounded-3xl bg-white p-8 shadow-[0px_20px_30px_0px_rgba(0,0,0,0.15)]"
        style={{ transform: `scale(${dialogScale})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-6 w-6 items-center justify-center text-[#045E96] hover:opacity-70"
          aria-label={tCommon("cancel")}
        >
          <span className="text-xl leading-none">×</span>
        </button>

        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/dashboard/Fire.svg" alt="" width={80} height={80} className="mb-4 h-20 w-20" />
          <h3 className="font-app-body text-3xl font-semibold leading-10 text-[#106FAA]">
            {tHome("streakTitle", { count: reward.streak })}
          </h3>
          <p className="mt-2 font-app-body text-lg font-normal leading-7 text-[#106FAA]">
            {tHome("streakEncouragement")}
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-[#F2FAFF] px-6 py-6">
          <div className="mb-4 text-center font-app-body text-base font-medium leading-6 text-[#106FAA]">
            {dateRange || tHome("weeklyProgress")}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weeklyProgressDays.map((day) => (
              <div
                key={day.dateKey}
                className={`flex flex-col items-center rounded-xl p-2 ${
                  day.signed ? "bg-[#D4EAF8]" : day.isFuture ? "bg-slate-50" : "bg-slate-100"
                }`}
              >
                <div
                  className={`mb-2 w-full text-center font-app-body text-xs font-medium leading-4 ${
                    day.isFuture && !day.signed ? "text-[#106FAA]/60" : "text-[#106FAA]"
                  }`}
                >
                  {day.label}
                </div>
                {day.signed ? (
                  <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4CAF50]">
                    <span className="inline-flex h-full w-full items-center justify-center font-['Inter'] text-sm font-normal leading-none text-white">
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
            <Image src="/checkin/coin.svg" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
          </div>
          <div className="inline-flex min-w-0 flex-1 flex-col items-start justify-start gap-1">
            <div className="self-stretch font-app-body text-sm font-medium leading-5 text-sky-700">
              {tHome("todaysReward")}
            </div>
            <div className="self-stretch break-words font-app-body text-xl font-semibold leading-8 text-amber-400">
              {coinRewardParts.map((part, index) => (
                <div key={`coin-reward-${index}`}>{part}</div>
              ))}
              {extraRewardParts.map((part, index) => (
                <div key={`extra-reward-${index}`}>{part}</div>
              ))}
            </div>
          </div>
        </div>

        {reward.membershipBonusPlan ? (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#106FAA]/50 to-[#0075FF]/50 p-0.5">
            <div className="inline-flex min-h-24 w-full items-center justify-start gap-4 rounded-[14px] bg-indigo-50 p-5">
              <div className="relative size-16 shrink-0">
                <Image src="/checkin/diamond.svg" alt="" width={64} height={64} className="h-16 w-16 object-contain" />
              </div>
              <div className="inline-flex min-w-0 flex-1 flex-col items-start justify-start gap-1">
                <div className="self-stretch">
                  <Image
                    src={
                      reward.membershipBonusPlan === "premium"
                        ? "/checkin/PREMIUM_Bonus.svg"
                        : "/checkin/PLUS_Bonus.svg"
                    }
                    alt={
                      reward.membershipBonusPlan === "premium"
                        ? tHome("premiumBonusAlt")
                        : tHome("plusBonusAlt")
                    }
                    width={112}
                    height={20}
                    className="h-4-auto object-contain"
                  />
                </div>
                <div className="self-stretch break-words font-app-body text-xl font-semibold leading-8 text-[#2478DC]">
                  {membershipBonusParts.map((part, index) => (
                    <div key={`membership-bonus-${index}`}>{part}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[100px] bg-[#E45C44] py-4 font-app-body text-lg font-semibold leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] hover:opacity-95"
        >
          {tHome("claimReward")}
        </button>
      </div>
    </div>
  );
}
