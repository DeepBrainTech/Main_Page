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

  return (
    <header className="absolute left-0 right-0 top-0 z-40">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div />

        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
          >
            {tCommon("login")}
          </button>
          <button
            onClick={onRegister}
            className="rounded-full bg-[#E76F51] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#d45d3f]"
          >
            {tCommon("register")}
          </button>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
