"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { CheckInState } from "@/hooks/useRewards";
import {
  dashboardCardClass,
  dashboardSectionHeaderRowClass,
  dashboardSectionPadding,
  dashboardSectionTitleClass,
} from "@/components/features/dashboard/dashboardCardStyles";

interface CheckInCalendarProps {
  checkIn: CheckInState;
  hasCheckedInToday: boolean;
  onCheckIn: () => void;
}

/**
 * Check-in calendar with compact layout
 */
export default function CheckInCalendar({
  checkIn,
  hasCheckedInToday,
  onCheckIn,
}: CheckInCalendarProps) {
  const tHome = useTranslations("dashboard");
  const locale = useLocale();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthYearLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const signedSet = new Set(
    checkIn.dates.filter((d) => d.startsWith(monthKey))
  );

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className={`${dashboardCardClass} flex w-full flex-col ${dashboardSectionPadding}`}>
      <div className={dashboardSectionHeaderRowClass}>
        <h3 className={dashboardSectionTitleClass}>{tHome("checkInTitle")}</h3>
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedInToday}
          className={`rounded-full px-[clamp(0.6rem,1.2vw,1rem)] py-[clamp(0.3rem,0.8vw,0.45rem)] font-app-body text-base font-medium transition-all shadow-sm ${
            hasCheckedInToday
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#E45C44] text-white hover:shadow-md hover:scale-105 active:scale-95"
          }`}
        >
          {hasCheckedInToday ? tHome("signed") : tHome("signToday")}
        </button>
      </div>

      <div className="flex flex-col">
        <div className="mb-[clamp(0.35rem,0.9vw,0.6rem)] text-center font-app-body text-[clamp(0.9rem,1.4vw,1.35rem)] font-semibold leading-[1.35] text-[#106FAA]">
          {monthYearLabel}
        </div>
        <div className="mb-[clamp(0.2rem,0.6vw,0.35rem)] grid grid-cols-7 gap-[clamp(0.2rem,0.6vw,0.5rem)] text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div
              key={w}
              className="py-[clamp(0.1rem,0.35vw,0.25rem)] font-app-body text-[clamp(0.62rem,1vw,1.02rem)] font-medium text-[#106FAA]"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[clamp(0.2rem,0.6vw,0.5rem)] text-center">
          {days.map((d, i) => {
            if (d === null)
              return <div key={`empty-${i}`} className="aspect-square " />;
            const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
            const signed = signedSet.has(dateStr);
            
            return (
              <div
                key={d}
                className={`aspect-square transition-all ${
                  signed
                    ? "bg-[#D4EAF8] rounded-xl text-[#106FAA]"
                    : "bg-[#EDF4FC] rounded-xl text-[#106FAA]"
                }`}
              >
                <div className="grid h-full w-full grid-rows-[1fr_auto_1fr_auto_1fr] place-items-center">
                  <Image
                    src={signed ? "/dashboard/checkin_icon.svg" : "/dashboard/nocheckin_icon.svg"}
                    alt={signed ? "checked in" : "not checked in"}
                    width={20}
                    height={20}
                    className="row-start-2 h-[clamp(0.5rem,1.25vw,1.7rem)] w-[clamp(0.5rem,1.25vw,1.7rem)]"
                  />
                  <span className="row-start-3 font-app-body text-[clamp(0.68rem,1vw,1.1rem)] font-normal leading-[1.1]">
                    {d}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
