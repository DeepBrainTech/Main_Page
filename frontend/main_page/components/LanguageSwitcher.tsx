"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n-navigation";
import { setNextLocaleCookie } from "@/lib/locale-cookie";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;
  const tCommon = useTranslations("common");

  const switchLanguage = (newLocale: string) => {
    setNextLocaleCookie(newLocale);
    router.push(pathname || "/", { locale: newLocale });
  };

  const nextLocale = currentLocale === "zh" ? "en" : "zh";
  const currentLocaleLabel =
    currentLocale === "zh" ? tCommon("localeZh") : tCommon("localeEn");

  return (
    <button
      type="button"
      onClick={() => switchLanguage(nextLocale)}
      className="font-app-body inline-flex min-h-[clamp(1.75rem,calc(1.35rem+2.75vw),3.5rem)] w-fit max-w-full items-center justify-center gap-[clamp(0.25rem,calc(0.12rem+1.1vw),0.625rem)] rounded-full border border-slate-300 bg-white px-[clamp(0.5rem,calc(0.35rem+2.5vw),1.75rem)] text-[clamp(0.6875rem,calc(0.5rem+1.15vw),1.0625rem)] font-semibold text-slate-700 transition hover:border-slate-400"
      aria-label={`Switch language, current ${currentLocaleLabel}`}
      title={`Switch language, current ${currentLocaleLabel}`}
    >
      <span
        className="relative size-[clamp(0.75rem,calc(0.45rem+1.85vw),1.25rem)] shrink-0 overflow-hidden"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-full w-full text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      </span>
      <span className="leading-none text-slate-700">{currentLocaleLabel}</span>
    </button>
  );
}
