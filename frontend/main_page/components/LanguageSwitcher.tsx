"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = (newLocale: string) => {
    setNextLocaleCookie(newLocale);
    setIsOpen(false);
    router.push(pathname || "/", { locale: newLocale });
  };

  const nextLocale = currentLocale === "zh" ? "en" : "zh";
  const currentLocaleLabel =
    currentLocale === "zh" ? tCommon("localeZh") : tCommon("localeEn");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="font-app-body inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-base font-normal text-[#1c1917] transition hover:bg-slate-50"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Select language, current ${currentLocaleLabel}`}
      >
        <span className="relative size-5 shrink-0 overflow-hidden rounded-sm bg-[repeating-linear-gradient(to_bottom,#fff_0,#fff_2px,#b91c1c_2px,#b91c1c_4px)]" aria-hidden="true"><span className="absolute left-0 top-0 size-2.5 bg-[#075985]" /></span>
        <span className="leading-none">{currentLocale.toUpperCase()}</span>
        <span
          aria-hidden="true"
          className={`mb-1 size-2.5 rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#27272a] transition-transform ${isOpen ? "rotate-[225deg]" : ""}`}
        />
      </button>
      {isOpen && (
        <div role="menu" className="font-app-body absolute left-0 top-[calc(100%+0.375rem)] z-50 min-w-28 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => switchLanguage(nextLocale)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#1c1917] transition hover:bg-[#edf4fa]"
          >
            <span aria-hidden="true">{nextLocale === "zh" ? "🇨🇳" : "🇺🇸"}</span>
            {nextLocale === "zh" ? tCommon("localeZh") : tCommon("localeEn")}
          </button>
        </div>
      )}
    </div>
  );
}
