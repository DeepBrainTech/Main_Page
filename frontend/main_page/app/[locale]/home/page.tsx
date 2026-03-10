"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { useGameLauncher } from "@/hooks/useGameLauncher";
import AppShell, { type AppTab } from "@/components/layout/AppShell";
import HomeTab from "@/components/features/home/HomeTab";
import TestTab from "@/components/features/test/TestTab";
import BrainGamesTab from "@/components/features/brain-games/BrainGamesTab";
import LeaderboardTab from "@/components/features/leaderboard/LeaderboardTab";

/**
 * 登录后的主页：Tab 导航（主页 / 脑力测试 / 脑力游戏 / 排行榜）+ 个人头像弹窗
 */
export default function HomePage() {
  const tCommon = useTranslations("common");
  const { username, loading, logout } = useAuth();
  const {
    handleFogChess,
    handleSudoku,
    handleQuantumGo,
    handleChessMater,
    handleChessTourmaster,
  } = useGameLauncher();
  const [activeTab, setActiveTab] = useState<AppTab>("home");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-gray-600">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      username={username}
      onLogout={logout}
    >
      {activeTab === "home" && <HomeTab username={username} />}
      {activeTab === "test" && <TestTab />}
      {activeTab === "brainGames" && (
        <BrainGamesTab
          onLaunch={{
            chessMater: handleChessMater,
            chessTourmaster: handleChessTourmaster,
            sudoku: handleSudoku,
            quantumGo: handleQuantumGo,
            fogChess: handleFogChess,
          }}
        />
      )}
      {activeTab === "leaderboard" && <LeaderboardTab />}
    </AppShell>
  );
}
