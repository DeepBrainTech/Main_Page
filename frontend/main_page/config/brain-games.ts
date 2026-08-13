/**
 * 脑力训练游戏按维度分类配置
 * 现有游戏按 product.md 放入对应维度，先占位
 */
import type { CognitiveDimensionKey } from "@/types/cognitive";
import type { PortalLaunchKey } from "@/config/game-launch";

export interface GameEntry {
  key: string;
  /** 游戏名称 i18n key */
  nameKey: string;
  /** 启动方法：由 useGameLauncher 提供 */
  launchKey: PortalLaunchKey | "external";
  externalUrl?: string;
  /** 为 true 时不使用封面图，仅占位背景（稍后补图时可删） */
  skipCover?: boolean;
}

export const GAMES_BY_DIMENSION: Record<CognitiveDimensionKey, GameEntry[]> = {
  memory: [
  ],
  logic: [
    { key: "sudoku", nameKey: "sudoku", launchKey: "sudoku" },
    { key: "number-blast", nameKey: "numberBlast", launchKey: "numberBlast" },
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
  ],
  reaction: [],
  strategy: [
    { key: "chessmater", nameKey: "chessMater", launchKey: "chessMater" },
    { key: "quantumgo", nameKey: "quantumGo", launchKey: "quantumGo" },
    { key: "fogchess", nameKey: "startFogChess", launchKey: "fogChess" },
    { key: "chess-tourmaster", nameKey: "chessTourmaster", launchKey: "chessTourmaster" },
    { key: "online-chess", nameKey: "onlineChess", launchKey: "onlineChess" },
    {
      key: "stack_math_chess",
      nameKey: "stackMathChess",
      launchKey: "external",
      externalUrl: "https://stack-math-chess.deepbraintechnology.com/",
    },
    {
      key: "recon_chess",
      nameKey: "reconChess",
      launchKey: "external",
      externalUrl: "https://rbc.deepbraintechnology.com/",
    },
    {
      key: "soccer_chess",
      nameKey: "soccerChess",
      launchKey: "external",
      externalUrl: "https://soccer-chess.deepbraintechnology.com/",
    },
    {
      key: "no-king-chess",
      nameKey: "nokingchess",
      launchKey: "external",
      externalUrl: "https://no-king-chess.deepbraintechnology.com/",
    },
  ],
  spatial: [
    {
      key: "dash-dot-simulator",
      nameKey: "dashDotSimulator",
      launchKey: "external",
      externalUrl: "https://dash-dot-simulator.deepbraintechnology.com/",
    },
  ],
};
