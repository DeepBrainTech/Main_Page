"use client";

import { useTranslations } from "next-intl";
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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
          <h3 className="font-bold text-gray-800">{tHome("checkInTitle")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{tHome("checkInStreak")}</p>
        </div>
        
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedInToday}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-sm ${
            hasCheckedInToday
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:shadow-md hover:scale-105 active:scale-95"
          }`}
        >
          {hasCheckedInToday ? tHome("signed") : tHome("signToday")}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
            <div key={w} className="py-1 text-[10px] text-gray-400 font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d, i) => {
            if (d === null)
              return <div key={`empty-${i}`} className="aspect-square" />;
            const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
            const signed = signedSet.has(dateStr);
            const isToday = d === today;
            
            return (
              <div
                key={d}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  signed
                    ? "bg-amber-100 text-amber-600"
                    : isToday
                      ? "ring-2 ring-amber-400 text-amber-600 bg-amber-50"
                      : "bg-gray-50 text-gray-400"
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
