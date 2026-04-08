"use client";

import { useRouter, usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as string;
  const tCommon = useTranslations("common");

  const switchLanguage = (newLocale: string) => {
    // 替换当前路径中的语言代码
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const nextLocale = currentLocale === "zh" ? "en" : "zh";
  const currentLocaleLabel =
    currentLocale === "zh" ? tCommon("localeZh") : tCommon("localeEn");

  return (
    <button
      type="button"
      onClick={() => switchLanguage(nextLocale)}
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition hover:border-slate-400"
      aria-label={`Switch language, current ${currentLocaleLabel}`}
      title={`Switch language, current ${currentLocaleLabel}`}
    >
      <span className="h-3.5 w-3.5 relative overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-slate-700"
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
      <span className="text-slate-700 text-xs font-semibold leading-none">
        {currentLocaleLabel}
      </span>
    </button>
  );
}
