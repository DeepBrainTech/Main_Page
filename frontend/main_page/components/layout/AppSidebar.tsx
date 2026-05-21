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

  return (
    <aside className="hidden w-64 shrink-0 px-4 py-5 lg:block">
      <div className="sticky top-24 flex min-h-[640px] flex-col rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
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
              <span className="font-app-body text-base font-normal leading-5">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
