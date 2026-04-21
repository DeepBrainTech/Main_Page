"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import ProfileDialog from "@/components/features/profile/ProfileDialog";
import { useRewards } from "@/hooks/useRewards";

export type AppTab = "dashboard" | "learning" | "test" | "brainGames" | "leaderboard";

interface AppShellProps {
  activeTab: AppTab;
  tabHrefMap: Record<AppTab, string>;
  username: string;
  email?: string;
  /** Date of birth in YYYY-MM-DD format */
  dateOfBirth?: string | null;
  onLogout: () => void;
  /** Callback after profile update */
  onProfileUpdate?: () => void;
  children: React.ReactNode;
}

/**
 * Post-login shell: sidebar + top bar + content area
 */
export default function AppShell({
  activeTab,
  tabHrefMap,
  username,
  email,
  dateOfBirth,
  onLogout,
  onProfileUpdate,
  children,
}: AppShellProps) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const { coins, diamonds, flowers } = useRewards();

  const tabs: { key: AppTab; label: string; iconSrc: string; iconAlt: string }[] = [
    { key: "dashboard", label: tHome("dashboardTab"), iconSrc: "/dashboard/dashboard.svg", iconAlt: "Dashboard" },
    { key: "brainGames", label: tNav("brainGames"), iconSrc: "/dashboard/brain_game.svg", iconAlt: "Brain Games" },
    { key: "leaderboard", label: tNav("leaderboard"), iconSrc: "/dashboard/leaderboard.svg", iconAlt: "Leaderboard" },
    { key: "test", label: tNav("test"), iconSrc: "/dashboard/test.svg", iconAlt: "Test" },
    { key: "learning", label: tNav("learning"), iconSrc: "/dashboard/learning.svg", iconAlt: "Learning" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 pb-8 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center">
            <Image
              src="/dashboard/logo.png"
              alt="DeepBrain Technology logo"
              width={220}
              height={64}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Image src="/dashboard/coin.svg" alt="Coins" width={16} height={16} className="h-4 w-4" />
                <span>{coins}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Image src="/dashboard/dimond.svg" alt="Diamonds" width={16} height={16} className="h-4 w-4" />
                <span>{diamonds}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Image src="/dashboard/flower.svg" alt="Flowers" width={16} height={16} className="h-4 w-4" />
                <span>{flowers}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-xl bg-indigo-50 px-2.5 py-2 text-sm text-sky-700 hover:bg-indigo-100"
              aria-label={tNav("profile")}
            >
              {"\u2699"}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600"
            >
              {tCommon("logout")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
          {tabs.map(({ key, label, iconSrc, iconAlt }) => (
            <Link
              key={key}
              href={tabHrefMap[key]}
              prefetch
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === key ? "bg-[#E45C44] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Image src={iconSrc} alt={iconAlt} width={14} height={14} className="h-3.5 w-3.5" />
                <span>{label}</span>
              </span>
            </Link>
          ))}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 px-4 py-5 lg:block">
          <div className="sticky top-24 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
            <nav className="space-y-2">
              {tabs.map(({ key, label, iconSrc, iconAlt }) => (
                <Link
                  key={key}
                  href={tabHrefMap[key]}
                  prefetch
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    activeTab === key
                      ? "bg-[#E45C44] text-white shadow-md shadow-red-200"
                      : "text-zinc-800 hover:bg-slate-100"
                  }`}
                >
                  <Image src={iconSrc} alt={iconAlt} width={18} height={18} className="h-[18px] w-[18px]" />
                  <span className="font-['Outfit'] text-base font-normal leading-5">{label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <span>{tHome("friends")}</span>
                <span>+</span>
              </div>
              <div className="space-y-2">
                {["Alex", "Maya", "Sam"].map((friendName) => (
                  <div key={friendName} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-2">
                    <div className="h-7 w-7 rounded-full bg-amber-100 text-center text-sm leading-7">{"\uD83D\uDE42"}</div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-700">{friendName}</div>
                      <div className="truncate text-[11px] text-sky-700">{tHome("friendStatus")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="px-4 pt-5 sm:px-6">{children}</main>
        </div>
      </div>

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        email={email}
        dateOfBirth={dateOfBirth}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}
