"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import { getUserTimezone } from "@/services/userApi";

/**
 * Game launch configuration type
 */
interface GameConfig {
  gameKey: string;
  apiEndpoint: string;
  gameUrl: string;
  openInNewTab?: boolean;
}

/**
 * Hook for game launching
 * Handles all game launch flows in one place
 */
export function useGameLauncher() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const tHome = useTranslations("dashboard");

  /**
   * Generic launcher function
   */
  const launchGame = async (config: GameConfig) => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      router.push(`/${locale}/login`);
      return;
    }

    try {
      // Request game token with user timezone for daily progress tracking
      const response = await fetch(getApiUrl(config.apiEndpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-User-Timezone": getUserTimezone(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch game token");
      }

      const data = await response.json();
      const gameToken = data?.data?.game_token;
      const assets = data?.data?.assets ?? { coins: 0, diamonds: 0, flowers: 0 };
      if (!gameToken) {
        throw new Error("Invalid game token response");
      }

      // Use configured game URL
      const gameUrl = config.gameUrl;
      
      if (!gameUrl) {
        throw new Error(`Missing game URL config (${config.gameKey})`);
      }
      
      console.log(`[${config.gameKey}] Using game URL:`, gameUrl);

      // Build final launch URL
      const portalApi = getApiUrl("");
      const url =
        `${gameUrl}#token=${encodeURIComponent(gameToken)}` +
        `&portal_token=${encodeURIComponent(accessToken)}` +
        `&portal_api=${encodeURIComponent(portalApi)}` +
        `&locale=${encodeURIComponent(locale)}` +
        `&coins=${encodeURIComponent(String(assets.coins ?? 0))}` +
        `&diamonds=${encodeURIComponent(String(assets.diamonds ?? 0))}` +
        `&flowers=${encodeURIComponent(String(assets.flowers ?? 0))}`;

      // Launch game
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

  // Launch handlers per game
  const handleFogChess = () => {
    launchGame({
      gameKey: "fogchess",
      apiEndpoint: "/api/games/fogchess/token",
      // Read from env var, fallback to default production URL
      gameUrl: process.env.NEXT_PUBLIC_FOGCHESS_URL || "https://fogchess.deepbraintechnology.com",
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
      // Read from env var, fallback to default production URL
      gameUrl: process.env.NEXT_PUBLIC_QUANTUMGO_URL || "https://quantumgo.deepbraintechnology.com/",
      openInNewTab: false,
    });
  };

  const handleChessMater = () => {
    launchGame({
      gameKey: "chessMater",
      apiEndpoint: "/api/games/chessmater/token",
      gameUrl: "https://chessmater.deepbraintechnology.com/",
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

    // Must open synchronously in user gesture to avoid popup blockers
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

