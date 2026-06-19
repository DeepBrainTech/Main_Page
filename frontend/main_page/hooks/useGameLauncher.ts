"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import { getUserTimezone, postGamePlayedRecord } from "@/services/userApi";

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
    try {
      // Auth is carried via the cross-subdomain HttpOnly cookie; no token in URL.
      const response = await apiFetch(config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Timezone": getUserTimezone(),
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch game token");
      }

      const data = await response.json();
      const gameToken = data?.data?.game_token;
      const assets = data?.data?.assets ?? { coins: 0, diamonds: 0, flowers: 0 };
      if (!gameToken) {
        throw new Error("Invalid game token response");
      }

      const gameUrl = config.gameUrl;
      if (!gameUrl) {
        throw new Error(`Missing game URL config (${config.gameKey})`);
      }

      console.log(`[${config.gameKey}] Using game URL:`, gameUrl);

      // First-paint hints only. Sub-games refresh game_token via cookie-based
      // /api/games/{game}/session, so we no longer pass portal_token/portal_api.
      const url =
        `${gameUrl}#token=${encodeURIComponent(gameToken)}` +
        `&locale=${encodeURIComponent(locale)}` +
        `&coins=${encodeURIComponent(String(assets.coins ?? 0))}` +
        `&diamonds=${encodeURIComponent(String(assets.diamonds ?? 0))}` +
        `&flowers=${encodeURIComponent(String(assets.flowers ?? 0))}`;

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

  const handleFogChess = () => {
    launchGame({
      gameKey: "fogchess",
      apiEndpoint: "/api/games/fogchess/token",
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

  const handleOnlineChess = () => {
    launchGame({
      gameKey: "online-chess",
      apiEndpoint: "/api/games/online-chess/token",
      gameUrl: process.env.NEXT_PUBLIC_ONLINE_CHESS_URL || "https://online-chess-web-production.up.railway.app",
      openInNewTab: false,
    });
  };

  const handleSudoku = () => {
    // Pure portal-side analytics ping; sub-game has no auth contract with us.
    void postGamePlayedRecord("sudoku").catch(() => {
      /* still open game; count may update on next rewards fetch */
    });
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
    handleOnlineChess,
  };
}

