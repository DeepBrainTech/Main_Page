"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
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
}: LandingHeaderProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("figmaHome");

  // Slow vw slope so min/max aren't reached until wider viewports — resizing stays visible through ~320–1600px
  const landingNavBtn =
    "font-app-body inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold leading-none transition sm:text-base";

  return (
    <header className="absolute left-0 right-0 top-0 z-40 w-full bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-24 w-[calc(100%-2.5rem)] max-w-[116rem] items-center justify-between gap-4 sm:w-[calc(100%-4rem)]">
        <a href="#top" className="flex h-24 shrink-0 items-center" aria-label="DeepBrain Technology home">
          <Image
            src="/dashboard/logo.png"
            alt="DeepBrain Technology"
            width={197}
            height={60}
            className="h-[60px] w-[197px] object-contain object-left"
            priority
          />
        </a>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
          <LanguageSwitcher />
          <a href="#contact" className={`${landingNavBtn} hidden bg-[#eef2ff] text-[#045e96] hover:bg-[#e0e7ff] sm:inline-flex`}>{t("contact")}</a>
          <button
            type="button"
            onClick={onLogin}
            className={`${landingNavBtn} rounded-xl bg-[#045e96] text-white hover:bg-[#034d7b]`}
          >
            {tCommon("login")}
          </button>
        </div>
      </div>
    </header>
  );
}
