export type WeeklyProgressDay = {
  label: string;
  dateKey: string;
  signed: boolean;
  isFuture: boolean;
};

export function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthDay(date: Date) {
  return `${date.getMonth() + 1}. ${date.getDate()}`;
}

export function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const mondayOffset = (date.getDay() + 6) % 7;
  weekStart.setDate(date.getDate() - mondayOffset);
  return weekStart;
}

/** Weekday labels indexed by Date.getDay() (0 = Sunday). */
export function getWeekdayLabels(
  t: (key: string) => string,
): string[] {
  return [
    t("weekdaySun"),
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
  ];
}

export function getCurrentWeekProgress(
  signedDates: string[],
  weekdayLabels: string[],
  today = new Date(),
): WeeklyProgressDay[] {
  const signedDateSet = new Set(signedDates);
  const todayKey = formatLocalDateKey(today);
  const weekStart = getWeekStart(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = formatLocalDateKey(date);

    return {
      label: weekdayLabels[date.getDay()],
      dateKey,
      signed: signedDateSet.has(dateKey),
      isFuture: dateKey > todayKey,
    };
  });
}

export function formatWeekDateRange(weekStart: Date, weekEnd: Date, separator: string) {
  return `${toMonthDay(weekStart)}${separator}${toMonthDay(weekEnd)}`;
}
