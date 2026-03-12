"use client";

import { useTranslations } from "next-intl";
import ProfileDialog from "@/components/features/profile/ProfileDialog";
import { useState } from "react";

export type AppTab = "home" | "test" | "brainGames" | "leaderboard";

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  username: string;
  email?: string;
  onLogout: () => void;
  /** 个人资料更新后回调（如刷新用户名展示） */
  onProfileUpdate?: () => void;
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
  onProfileUpdate,
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
    <div className="min-h-screen bg-[var(--background)] font-sans pb-10">
      <header className="sticky top-0 z-30 glass-panel mb-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-lg">🧠</span>
            <span className="font-bold text-gray-800 tracking-tight">{tCommon("appName")}</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-gray-100/50 p-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === key
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3">
            {/* Mobile Nav Toggle could go here */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1 pr-3 py-1 shadow-sm hover:bg-gray-50 transition-colors"
              aria-label={tNav("profile")}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs text-white">
                 {username.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="text-xs font-medium text-gray-700 hidden sm:block truncate max-w-[80px]">{username}</span>
            </button>
          </div>
        </div>
        {/* Mobile Nav (Simple) */}
        <div className="md:hidden flex justify-around border-t border-gray-100 bg-white/50 py-2">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`text-xs font-medium px-2 py-1 rounded ${activeTab === key ? "text-indigo-600 bg-indigo-50" : "text-gray-500"}`}
              >
                {label}
              </button>
            ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4">{children}</main>
      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        username={username}
        email={email}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}
