"use client";

import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface LandingHeaderProps {
  onLogin: () => void;
  onRegister: () => void;
}

/**
 * Landing 顶部导航
 */
export default function LandingHeader({
  onLogin,
  onRegister,
}: LandingHeaderProps) {
  const tCommon = useTranslations("common");

  // Slow vw slope so min/max aren't reached until wider viewports — resizing stays visible through ~320–1600px
  const landingNavBtn =
    "font-app-body inline-flex min-h-[clamp(1.75rem,calc(1.35rem+2.75vw),3.5rem)] w-fit max-w-full items-center justify-center rounded-full px-[clamp(0.5rem,calc(0.35rem+2.5vw),1.75rem)] text-[clamp(0.6875rem,calc(0.5rem+1.15vw),1.0625rem)] font-semibold leading-none transition";

  return (
    <header className="absolute left-0 right-0 top-0 z-40 w-full">
      <div className="mx-auto flex w-full max-w-[min(100%,80rem)] items-center justify-end gap-[clamp(0.375rem,calc(0.2rem+2vw),1.125rem)] py-[clamp(0.625rem,calc(0.45rem+1.5vw),1.5rem)] pl-[clamp(1rem,5vw,2.5rem)] pr-[max(0rem,min(0.5vw,0.5rem))]">
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-[clamp(0.375rem,calc(0.2rem+2vw),1rem)]">
          <button
            type="button"
            onClick={onLogin}
            className={`${landingNavBtn} border border-slate-300 bg-white text-slate-700 hover:border-slate-400`}
          >
            {tCommon("login")}
          </button>
          <button
            type="button"
            onClick={onRegister}
            className={`${landingNavBtn} bg-[#E76F51] text-white hover:bg-[#d45d3f]`}
          >
            {tCommon("register")}
          </button>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
