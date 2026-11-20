"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n-navigation";
import { buildAppShellTabs } from "@/components/layout/appShellTabs";
import type { AppTab } from "@/components/layout/appShellTypes";

interface AppSidebarProps {
  activeTab: AppTab | null;
  tabHrefMap: Record<AppTab, string>;
}

export default function AppSidebar({ activeTab, tabHrefMap }: AppSidebarProps) {
  const tNav = useTranslations("nav");
  const tHome = useTranslations("dashboard");
  const tabs = buildAppShellTabs(tNav, tHome);

  const friendPlaceholders = [
    { name: "Alex", initial: "A", avatarClass: "bg-sky-100 text-sky-700" },
    { name: "Maya", initial: "M", avatarClass: "bg-rose-100 text-rose-600" },
    { name: "Sam", initial: "S", avatarClass: "bg-emerald-100 text-emerald-700" },
  ] as const;

  return (
    <aside
      className="sticky top-(--app-header-height) hidden h-[calc(100dvh-var(--app-header-height))] w-[18.4375rem] shrink-0 self-start pb-6 pl-6 pt-5 [--app-header-height:calc(var(--app-header-row-height)+1px)] lg:block"
      aria-label={tNav("home")}
    >
      <div className="flex h-full flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
        <nav className="space-y-2">
          {tabs.map(({ key, label, iconSrc, iconAlt }) => {
            const isActive = activeTab === key;
            return (
              <Link
                key={key}
                href={tabHrefMap[key]}
                prefetch
                className={`flex w-full items-center gap-[1.125rem] rounded-xl py-3 pl-6 pr-3 transition ${
                  isActive
                    ? "bg-[#E45C44] text-white shadow-md shadow-red-200"
                    : "text-zinc-800 hover:bg-slate-100"
                }`}
              >
                <Image
                  src={iconSrc}
                  alt={iconAlt}
                  width={20}
                  height={20}
                  className={`shrink-0 ${isActive ? "brightness-0 invert" : ""}`}
                />
                <span className="font-app-body text-base font-normal leading-5 tracking-[-0.0094em]">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span>{tHome("friends")}</span>
            <span>+</span>
          </div>
          <div className="space-y-2">
            {friendPlaceholders.map(({ name, initial, avatarClass }) => (
              <div key={name} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarClass}`}
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-700">{name}</div>
                  <div className="truncate text-[11px] text-sky-700">{tHome("friendStatus")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
