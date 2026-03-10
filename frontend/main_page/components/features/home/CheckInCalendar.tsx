"use client";

import { useTranslations } from "next-intl";
import type { CheckInState } from "@/hooks/useRewards";

interface CheckInCalendarProps {
  checkIn: CheckInState;
  hasCheckedInToday: boolean;
  onCheckIn: () => void;
}

/**
 * 签到日历：当月视图，已签/未签区分，今日签到按钮
 */
export default function CheckInCalendar({
  checkIn,
  hasCheckedInToday,
  onCheckIn,
}: CheckInCalendarProps) {
  const tHome = useTranslations("home");

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
    <div className="rounded-xl bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{tHome("checkInTitle")}</h3>
        <button
          type="button"
          onClick={onCheckIn}
          disabled={hasCheckedInToday}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            hasCheckedInToday
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-amber-500 text-white hover:bg-amber-600"
          }`}
        >
          {hasCheckedInToday ? tHome("signed") : tHome("signToday")}
        </button>
      </div>
      <p className="mb-2 text-xs text-gray-500">
        {tHome("checkInReward")} · {tHome("checkInStreak")}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
          <div key={w} className="py-1 text-xs text-gray-500">
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          if (d === null)
            return <div key={`empty-${i}`} className="aspect-square" />;
          const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
          const signed = signedSet.has(dateStr);
          const isToday = d === today;
          return (
            <div
              key={d}
              className={`aspect-square flex items-center justify-center rounded text-sm ${
                signed
                  ? "bg-amber-500 text-white"
                  : isToday
                    ? "ring-2 ring-amber-500"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
