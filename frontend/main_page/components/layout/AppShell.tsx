"use client";

import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileDialog from "@/components/features/profile/ProfileDialog";
import { useState } from "react";

export type AppTab = "home" | "test" | "brainGames" | "leaderboard";

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  username: string;
  email?: string;
  onLogout: () => void;
  children: React.ReactNode;
}

/**
 * 登录后主框架：顶部导航 Tab + 右侧头像（打开个人弹窗）
 */
export default function AppShell({
  activeTab,
  onTabChange,
  username,
  email,
  onLogout,
  children,
}: AppShellProps) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [profileOpen, setProfileOpen] = useState(false);

  const tabs: { key: AppTab; label: string }[] = [
    { key: "home", label: tNav("home") },
    { key: "test", label: tNav("test") },
    { key: "brainGames", label: tNav("brainGames") },
    { key: "leaderboard", label: tNav("leaderboard") },
  ];

  return (
    <div className="min-h-screen bg-[#FEF6EC] font-sans">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">🧠 DeepBrain Tech</span>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "bg-[#5E81AC] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5E81AC] text-white shadow"
              aria-label={tNav("profile")}
            >
              {username.charAt(0).toUpperCase() || "?"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {tCommon("logout")}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        email={email}
      />
    </div>
  );
}
