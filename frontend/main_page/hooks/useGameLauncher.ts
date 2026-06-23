"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import { getUserTimezone, postGamePlayedRecord } from "@/services/userApi";
import {
  GAME_LAUNCH_BY_KEY,
  GAME_LAUNCH_ENTRIES,
  type AnalyticsGameLaunchEntry,
  type PortalLaunchKey,
  type TokenGameLaunchEntry,
} from "@/config/game-launch";

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

  const launchGame = async (config: GameConfig) => {
    try {
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

  const launchTokenGame = (entry: TokenGameLaunchEntry) => {
    void launchGame({
      gameKey: entry.apiSlug,
      apiEndpoint: `/api/games/${entry.apiSlug}/token`,
      gameUrl: entry.gameUrl,
      openInNewTab: entry.openInNewTab,
    });
  };

  const launchAnalyticsGame = (entry: AnalyticsGameLaunchEntry) => {
    void postGamePlayedRecord(entry.playedRecordKey).catch(() => {
      /* still open game; count may update on next rewards fetch */
    });
    if (entry.openInNewTab) {
      window.open(entry.gameUrl, "_blank");
    } else {
      window.location.href = entry.gameUrl;
    }
  };

  const launchByKey = (key: PortalLaunchKey) => {
    const entry = GAME_LAUNCH_BY_KEY[key];
    if (entry.kind === "token") {
      launchTokenGame(entry);
    } else {
      launchAnalyticsGame(entry);
    }
  };

  const handlers = Object.fromEntries(
    GAME_LAUNCH_ENTRIES.map((entry) => [
      entry.launchKey,
      () => {
        if (entry.kind === "token") {
          launchTokenGame(entry);
        } else {
          launchAnalyticsGame(entry);
        }
      },
    ]),
  ) as Record<PortalLaunchKey, () => void>;

  return {
    launchByKey,
    handleFogChess: handlers.fogChess,
    handleSudokuBattle: handlers.sudokuBattle,
    handleSudoku: handlers.sudoku,
    handleQuantumGo: handlers.quantumGo,
    handleChessMater: handlers.chessMater,
    handleChessTourmaster: handlers.chessTourmaster,
    handleOnlineChess: handlers.onlineChess,
  };
}
