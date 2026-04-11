/**
 * 脑力训练游戏按维度分类配置
 * 现有游戏按 product.md 放入对应维度，先占位
 */
import type { CognitiveDimensionKey } from "@/types/cognitive";

export interface GameEntry {
  key: string;
  /** 游戏名称 i18n key */
  nameKey: string;
  /** 启动方法：由 useGameLauncher 提供 */
  launchKey: "chessMater" | "chessTourmaster" | "sudoku" | "quantumGo" | "fogChess" | "external";
  externalUrl?: string;
  /** 为 true 时不使用封面图，仅占位背景（稍后补图时可删） */
  skipCover?: boolean;
}

export const GAMES_BY_DIMENSION: Record<CognitiveDimensionKey, GameEntry[]> = {
  memory: [
    { key: "sudoku", nameKey: "sudoku", launchKey: "sudoku" },
  ],
  logic: [
    { key: "chessmater", nameKey: "chessMater", launchKey: "chessMater" },
    { key: "chess-tourmaster", nameKey: "chessTourmaster", launchKey: "chessTourmaster" },
    {
      key: "intercontinental-chess",
      nameKey: "intercontinentalChess",
      launchKey: "external",
      externalUrl: "https://intercontinental-chess.deepbraintechnology.com/",
    },
    {
      key: "mathchess",
      nameKey: "mathChess",
      launchKey: "external",
      externalUrl: "https://mathchess.deepbraintechnology.com/",
    },
  ],
  focus: [
    { key: "sudoku", nameKey: "sudoku", launchKey: "sudoku" },
  ],
  reaction: [],
  strategy: [
    { key: "quantumgo", nameKey: "quantumGo", launchKey: "quantumGo" },
    { key: "fogchess", nameKey: "startFogChess", launchKey: "fogChess" },
    { key: "chess-tourmaster", nameKey: "chessTourmaster", launchKey: "chessTourmaster" },
  ],
  spatial: [
    { key: "chessmater", nameKey: "chessMater", launchKey: "chessMater" },
    {
      key: "dash-dot-simulator",
      nameKey: "dashDotSimulator",
      launchKey: "external",
      externalUrl: "https://dash-dot-simulator.deepbraintechnology.com/",
    },
  ],
};
