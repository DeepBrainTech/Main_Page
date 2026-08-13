import type { AppTab } from "@/components/layout/appShellTypes";

export type AppShellTabItem = {
  key: AppTab;
  label: string;
  iconSrc: string;
  iconAlt: string;
};

export function buildAppShellTabs(
  tNav: (key: string) => string,
  tHome: (key: string) => string,
): AppShellTabItem[] {
  return [
    {
      key: "dashboard",
      label: tHome("dashboardTab"),
      iconSrc: "/dashboard/dashboard.svg",
      iconAlt: tHome("dashboardTab"),
    },
    {
      key: "learning",
      label: tNav("learning"),
      iconSrc: "/dashboard/learning.svg",
      iconAlt: tNav("learning"),
    },
    {
      key: "brainGames",
      label: tNav("brainGames"),
      iconSrc: "/dashboard/brain_game.svg",
      iconAlt: tNav("brainGames"),
    },
    {
      key: "training",
      label: tNav("training"),
      iconSrc: "/dashboard/level.svg",
      iconAlt: tNav("training"),
    },
    {
      key: "leaderboard",
      label: tNav("leaderboard"),
      iconSrc: "/dashboard/leaderboard.svg",
      iconAlt: tNav("leaderboard"),
    },
    {
      key: "test",
      label: tNav("test"),
      iconSrc: "/dashboard/test.svg",
      iconAlt: tNav("test"),
    },
  ];
}
