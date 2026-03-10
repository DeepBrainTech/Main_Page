/**
 * 每日/每月任务配置
 * 每日三任务：完成一局 chessmaster、一局 chesstourmaster、一个空位
 * 每月任务：通关前 20 局 chess tourmaster → 10 钻石
 */

export type TaskType = "daily" | "monthly";

export interface TaskConfig {
  id: string;
  type: TaskType;
  /** i18n key 描述 */
  labelKey: string;
  /** 完成条件：游戏 mode key 或占位 'placeholder' */
  gameMode?: string;
  /** 目标次数 */
  targetCount?: number;
  /** 奖励：金币或钻石 */
  rewardCoins?: number;
  rewardDiamonds?: number;
}

/** 每日任务：固定三个，第三个占位 */
export const DAILY_TASKS: TaskConfig[] = [
  {
    id: "daily-1",
    type: "daily",
    labelKey: "dailyPlayChessMaster",
    gameMode: "chessmater",
    targetCount: 1,
    rewardCoins: 10,
  },
  {
    id: "daily-2",
    type: "daily",
    labelKey: "dailyPlayChessTourmaster",
    gameMode: "chess-tourmaster",
    targetCount: 1,
    rewardCoins: 10,
  },
  {
    id: "daily-3",
    type: "daily",
    labelKey: "dailyPlaceholder",
    gameMode: "placeholder",
    targetCount: 0,
    rewardCoins: 0,
  },
];

/** 每月任务 */
export const MONTHLY_TASK: TaskConfig = {
  id: "monthly-1",
  type: "monthly",
  labelKey: "monthlyChessTourmaster20",
  gameMode: "chess-tourmaster",
  targetCount: 20,
  rewardDiamonds: 10,
};
