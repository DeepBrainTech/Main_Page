"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import { getUserTimezone } from "@/services/userApi";

/**
 * 游戏启动配置类型
 */
interface GameConfig {
  gameKey: string;
  apiEndpoint: string;
  gameUrl: string;
  openInNewTab?: boolean;
}

/**
 * 游戏启动相关的 Hook
 * 统一处理所有游戏的启动逻辑
 */
export function useGameLauncher() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tHome = useTranslations("home");

  /**
   * 启动游戏的通用函数
   */
  const launchGame = async (config: GameConfig) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push(`/${locale}/login`);
      return;
    }

    try {
      // 获取游戏令牌（带用户时区，用于按日任务进度）
      const response = await fetch(getApiUrl(config.apiEndpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-User-Timezone": getUserTimezone(),
        },
      });

      if (!response.ok) {
        throw new Error("获取游戏令牌失败");
      }

      const data = await response.json();
      const gameToken = data?.data?.game_token;
      const assets = data?.data?.assets ?? { coins: 0, diamonds: 0, flowers: 0 };
      if (!gameToken) {
        throw new Error("无效的游戏令牌响应");
      }

      // 使用配置中的游戏 URL
      const gameUrl = config.gameUrl;
      
      if (!gameUrl) {
        throw new Error(`未配置游戏 URL (${config.gameKey})`);
      }
      
      console.log(`[${config.gameKey}] 使用游戏 URL:`, gameUrl);

      // 构建完整 URL
      const portalApi = getApiUrl("");
      const url =
        `${gameUrl}#token=${encodeURIComponent(gameToken)}` +
        `&portal_token=${encodeURIComponent(accessToken)}` +
        `&portal_api=${encodeURIComponent(portalApi)}` +
        `&locale=${encodeURIComponent(locale)}` +
        `&coins=${encodeURIComponent(String(assets.coins ?? 0))}` +
        `&diamonds=${encodeURIComponent(String(assets.diamonds ?? 0))}` +
        `&flowers=${encodeURIComponent(String(assets.flowers ?? 0))}`;

      // 打开游戏
      if (config.openInNewTab) {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.error(error);
      alert(tHome("failedToStartGame"));
    }
  };

  // 各个游戏的启动函数
  const handleFogChess = () => {
    launchGame({
      gameKey: "fogchess",
      apiEndpoint: "/api/games/fogchess/token",
      // 直接读取环境变量，如果没有设置则使用默认线上地址
      gameUrl: process.env.NEXT_PUBLIC_FOGCHESS_URL || "https://fogchess-frontend.onrender.com",
      openInNewTab: false,
    });
  };

  const handleSudokuBattle = () => {
    launchGame({
      gameKey: "sudokuBattle",
      apiEndpoint: "/api/games/sudoku/token",
      gameUrl: "https://sudoku-battle.deepbraintechnology.com/",
      openInNewTab: true,
    });
  };

  const handleQuantumGo = () => {
    launchGame({
      gameKey: "quantumGo",
      apiEndpoint: "/api/games/quantumgo/token",
      // 直接读取环境变量，如果没有设置则使用默认线上地址
      gameUrl: process.env.NEXT_PUBLIC_QUANTUMGO_URL || "https://quantumgo.deepbraintechnology.com/",
      openInNewTab: false,
    });
  };

  const handleChessMater = () => {
    launchGame({
      gameKey: "chessMater",
      apiEndpoint: "/api/games/chessmater/token",
      gameUrl: "https://chessmaster.deepbraintechnology.com/",
      openInNewTab: false,
    });
  };

  const handleChessTourmaster = () => {
    launchGame({
      gameKey: "chessTourmaster",
      apiEndpoint: "/api/games/chess-tourmaster/token",
      gameUrl: "https://chess-tourmaster.deepbraintechnology.com",
      openInNewTab: false,
    });
  };

  const handleSudoku = () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push(`/${locale}/login`);
      return;
    }

    // 必须在用户手势内同步打开窗口，否则触屏/弹窗拦截会阻止打开
    window.open("https://sudoku.deepbraintechnology.com/", "_blank");
  };

  return {
    handleFogChess,
    handleSudokuBattle,
    handleSudoku,
    handleQuantumGo,
    handleChessMater,
    handleChessTourmaster,
  };
}

