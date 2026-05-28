"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { CheckInState } from "@/hooks/useRewards";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";

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
  while (days.length % 7 !== 0) days.push(null);

  return (
    <div
      className={`${dashboardCardClass} @container/checkin flex w-full flex-col p-[clamp(1.25rem,2.2vw,2rem)]`}
    >
      <div className="mb-[clamp(1rem,2vw,1.5rem)] flex min-h-[clamp(2.25rem,4vw,2.5rem)] items-center justify-between gap-[clamp(0.75rem,1.5vw,1rem)]">
        <h3 className="font-['Titan_One'] text-[clamp(1.25rem,2vw,1.5rem)] font-normal leading-8 tracking-wide text-sky-700">
          {tHome("checkInTitle")}
        </h3>
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedInToday}
          className={`rounded-full px-[clamp(0.85rem,1.8vw,1rem)] py-[clamp(0.45rem,0.9vw,0.5rem)] font-['Outfit'] text-[clamp(0.8rem,1.2vw,1rem)] font-medium leading-6 transition-all shadow-sm ${
            hasCheckedInToday
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#E45C44] text-white hover:shadow-md hover:scale-105 active:scale-95"
          }`}
        >
          {hasCheckedInToday ? tHome("signed") : tHome("signToday")}
        </button>
      </div>

      <div className="flex flex-col">
        <div className="mb-[clamp(0.7rem,1.5vw,0.95rem)] text-center font-['Outfit'] text-[clamp(1rem,1.35vw,1.125rem)] font-semibold leading-7 text-sky-700">
          {monthYearLabel}
        </div>
        <div className="mb-[clamp(0.45rem,1vw,0.75rem)] grid grid-cols-7 gap-[clamp(0.38rem,1vw,0.55rem)] text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div
              key={w}
              className="py-[clamp(0.1rem,0.35vw,0.25rem)] font-['Outfit'] text-sm font-medium leading-5 text-sky-700"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[clamp(0.3rem,1.55cqw,0.55rem)] text-center">
          {days.map((d, i) => {
            if (d === null)
              return <div key={`empty-${i}`} className="aspect-square" />;
            const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
            const signed = signedSet.has(dateStr);
            
            return (
              <div
                key={d}
                className={`aspect-square rounded-xl transition-all ${
                  signed
                    ? "bg-[#D4EAF8] text-sky-700"
                    : "bg-[#EDF4FC] text-sky-700"
                }`}
              >
                <div className="flex h-full w-full flex-col items-center justify-center gap-[clamp(0.05rem,0.75cqw,0.35rem)]">
                  <Image
                    src={signed ? "/dashboard/checkin_icon.svg" : "/dashboard/nocheckin_icon.svg"}
                    alt={signed ? "checked in" : "not checked in"}
                    width={20}
                    height={20}
                    className="h-[clamp(0.75rem,4.4cqw,1.5rem)] w-[clamp(0.75rem,4.4cqw,1.5rem)]"
                  />
                  <span className="font-['Outfit'] text-[clamp(0.65rem,2.5cqw,0.875rem)] font-normal leading-none text-sky-700">
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
