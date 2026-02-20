"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import { useCallback, useEffect, useState } from "react";

/**
 * 游戏启动配置类型
 */
interface GameConfig {
  gameKey: string;
  apiEndpoint: string;
  gameUrl: string;
  openInNewTab?: boolean;
}

interface RewardStatus {
  game_mode: string;
  flowers_earned: number;
  click_count: number;
  last_played_at: string | null;
  last_claimed_at: string | null;
  can_claim_now: boolean;
  seconds_until_next_claim: number;
}

interface RewardsResponseData {
  total_flowers: number;
  rewards: RewardStatus[];
  server_time: string;
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
  const [totalFlowers, setTotalFlowers] = useState(0);
  const [rewardByMode, setRewardByMode] = useState<Record<string, RewardStatus>>({});

  const setRewardsData = useCallback((data: RewardsResponseData) => {
    setTotalFlowers(data.total_flowers ?? 0);
    const next: Record<string, RewardStatus> = {};
    for (const item of data.rewards ?? []) {
      next[item.game_mode] = item;
    }
    setRewardByMode(next);
  }, []);

  const fetchRewardsStatus = useCallback(async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      return;
    }

    const response = await fetch(getApiUrl("/api/games/rewards/status"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error("获取奖励状态失败");
    }

    const data = await response.json();
    if (data?.data) {
      setRewardsData(data.data as RewardsResponseData);
    }
  }, [setRewardsData]);

  useEffect(() => {
    fetchRewardsStatus().catch((error) => {
      console.error(error);
    });

    const intervalId = window.setInterval(() => {
      fetchRewardsStatus().catch((error) => {
        console.error(error);
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchRewardsStatus]);

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
      // 获取游戏令牌
      const response = await fetch(getApiUrl(config.apiEndpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取游戏令牌失败");
      }

      const data = await response.json();
      const gameToken = data?.data?.game_token;
      if (!gameToken) {
        throw new Error("无效的游戏令牌响应");
      }

      if (data?.data?.reward_status) {
        const rewardStatus = data.data.reward_status as RewardStatus;
        setRewardByMode((prev) => ({
          ...prev,
          [rewardStatus.game_mode]: rewardStatus,
        }));
      }
      if (typeof data?.data?.total_flowers === "number") {
        setTotalFlowers(data.data.total_flowers);
      }

      // 使用配置中的游戏 URL
      const gameUrl = config.gameUrl;
      
      if (!gameUrl) {
        throw new Error(`未配置游戏 URL (${config.gameKey})`);
      }
      
      console.log(`[${config.gameKey}] 使用游戏 URL:`, gameUrl);

      // 构建完整 URL
      const url = `${gameUrl}#token=${encodeURIComponent(gameToken)}&locale=${encodeURIComponent(locale)}`;

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

  const handleIntercontinentalChess = () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push(`/${locale}/login`);
      return;
    }

    fetch(getApiUrl("/api/games/intercontinental-chess/play"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("记录洲际象棋奖励失败");
        }
        const data = await response.json();
        if (data?.data?.reward_status) {
          const rewardStatus = data.data.reward_status as RewardStatus;
          setRewardByMode((prev) => ({
            ...prev,
            [rewardStatus.game_mode]: rewardStatus,
          }));
        }
        if (typeof data?.data?.total_flowers === "number") {
          setTotalFlowers(data.data.total_flowers);
        }
      })
      .catch((error) => {
        console.error(error);
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

    fetch(getApiUrl("/api/games/sudoku/play"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("记录数独奖励失败");
        }
        const data = await response.json();
        if (data?.data?.reward_status) {
          const rewardStatus = data.data.reward_status as RewardStatus;
          setRewardByMode((prev) => ({
            ...prev,
            [rewardStatus.game_mode]: rewardStatus,
          }));
        }
        if (typeof data?.data?.total_flowers === "number") {
          setTotalFlowers(data.data.total_flowers);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return {
    handleFogChess,
    handleSudokuBattle,
    handleSudoku,
    handleQuantumGo,
    handleChessMater,
    handleChessTourmaster,
    handleIntercontinentalChess,
    totalFlowers,
    rewardByMode,
  };
}

