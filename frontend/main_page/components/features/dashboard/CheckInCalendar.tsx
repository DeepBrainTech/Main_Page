"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { CheckInState } from "@/hooks/useRewards";

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
    <div className="h-full rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-['Titan_One'] font-normal text-[#045E96]">{tHome("checkInTitle")}</h3>
        </div>
        
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedInToday}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-sm ${
            hasCheckedInToday
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-[#E45C44] text-white hover:shadow-md hover:scale-105 active:scale-95"
          }`}
        >
          {hasCheckedInToday ? tHome("signed") : tHome("signToday")}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-2 text-center text-[#106FAA] text-lg font-semibold font-['Outfit'] leading-7">
          {monthYearLabel}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w} className="py-1 text-sm text-[#106FAA] font-medium font-['Outfit']">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center  ">
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
                    className="row-start-2 h-5 w-5"
                  />
                  <span className="row-start-3 text-sm font-normal font-['Outfit'] leading-4">{d}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
