"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { CheckInState } from "@/hooks/useRewards";
import { getWeekdayLabels } from "@/lib/weekProgress";
import {
  dashboardCardClass,
  dashboardPairedCardPadding,
  dashboardSectionHeaderBlockClass,
  dashboardSectionSignTodayButtonClass,
  dashboardSectionSignedBadgeClass,
  dashboardSectionSubtitleClass,
  dashboardSectionSubtitleRowClass,
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
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthYearLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const signedSet = new Set(checkIn.dates.filter((date) => date.startsWith(`${monthKey}-`)));
  const [sunday, ...weekdays] = getWeekdayLabels(tHome);
  const numberFormat = new Intl.NumberFormat(locale);
  const percentFormat = new Intl.NumberFormat(locale, { style: "percent" });
  const checkInSummary = [
    {
      label: tHome("checkInDaysChecked"),
      value: checkIn.totalDays === null ? "—" : numberFormat.format(checkIn.totalDays),
    },
    { label: tHome("checkInThisMonth"), value: numberFormat.format(signedSet.size) },
    { label: tHome("checkInCompletion"), value: percentFormat.format(signedSet.size / daysInMonth) },
  ];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  return (
    <div
      className={`${dashboardCardClass} @container/checkin flex w-full flex-col ${dashboardPairedCardPadding}`}
    >
      <div className={dashboardSectionHeaderBlockClass}>
        <h3 className={dashboardSectionTitleClass}>{tHome("checkInTitle")}</h3>
        {hasCheckedInToday ? (
          <span className={dashboardSectionSignedBadgeClass}>{tHome("signed")}</span>
        ) : (
          <button type="button" onClick={onCheckIn} className={dashboardSectionSignTodayButtonClass}>
            {tHome("signToday")}
          </button>
        )}
      </div>

      <div className={`${dashboardSectionSubtitleRowClass} justify-center`}>
        <div className={`${dashboardSectionSubtitleClass} text-center`}>{monthYearLabel}</div>
      </div>

      <div className="flex flex-col">
        <div className="mb-[clamp(0.45rem,1vw,0.75rem)] grid grid-cols-7 gap-[clamp(0.38rem,1vw,0.55rem)] text-center">
          {[...weekdays, sunday].map((w) => (
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

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-sky-700 sm:mt-6 sm:gap-4">
        {checkInSummary.map(({ label, value }) => (
          <div key={label} className="flex min-h-16 min-w-0 flex-col justify-center rounded-2xl bg-[#EDF4FC] px-1 py-2 2xl:min-h-21">
            <dt className="order-2 font-app-body text-xs sm:text-sm">{label}</dt>
            <dd className="font-app-body text-xl font-semibold leading-tight sm:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
