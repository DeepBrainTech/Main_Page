/** Shared glass card shell for dashboard sections (matches home.md: white/60 + outline/shadow) */
export const dashboardCardClass =
  "rounded-3xl bg-white/60 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1px] outline-white/60";

/** Paired section cards (check-in + brain hub) — keep header/subtitle rows in sync */
export const dashboardPairedCardPadding = "p-[clamp(1.25rem,2.2vw,2rem)]";

export const dashboardSectionHeaderBlockClass =
  "mb-[clamp(1rem,2vw,1.5rem)] flex min-h-[clamp(2.25rem,4vw,2.5rem)] shrink-0 items-center justify-between gap-[clamp(0.75rem,1.5vw,1rem)]";

export const dashboardSectionTitleClass =
  "font-['Titan_One'] text-[clamp(1.25rem,2vw,1.5rem)] font-normal leading-8 tracking-wide text-sky-700";

/** Signed state — gray pill, same size/font as completed badge */
export const dashboardSectionSignedBadgeClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 px-[clamp(0.85rem,1.8vw,1rem)] py-[clamp(0.45rem,0.9vw,0.5rem)] font-['Outfit'] text-[clamp(0.8rem,1.2vw,1rem)] font-medium leading-6 text-gray-400";

/** Completed goals badge */
export const dashboardSectionStatusBadgeClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-blue-100 px-[clamp(0.85rem,1.8vw,1rem)] py-[clamp(0.45rem,0.9vw,0.5rem)] font-['Outfit'] text-[clamp(0.8rem,1.2vw,1rem)] font-medium leading-6 text-sky-700";

export const dashboardSectionSignTodayButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-[#E45C44] px-[clamp(0.85rem,1.8vw,1rem)] py-[clamp(0.45rem,0.9vw,0.5rem)] font-['Outfit'] text-[clamp(0.8rem,1.2vw,1rem)] font-medium leading-6 text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95";

/** Subtitle row — "May 2026" / "Daily Goals (0/2)" share the same vertical slot */
export const dashboardSectionSubtitleRowClass =
  "mb-[clamp(0.7rem,1.5vw,0.95rem)] flex min-h-7 shrink-0 items-center";

export const dashboardSectionSubtitleClass =
  "font-['Outfit'] text-[clamp(1rem,1.35vw,1.125rem)] font-semibold leading-7 text-sky-700";
