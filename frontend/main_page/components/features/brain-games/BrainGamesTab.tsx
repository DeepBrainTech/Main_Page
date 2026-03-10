"use client";

import { useTranslations } from "next-intl";
import { GAMES_BY_DIMENSION } from "@/config/brain-games";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import type { GameEntry } from "@/config/brain-games";

interface BrainGamesTabProps {
  onLaunch: {
    chessMater: () => void;
    chessTourmaster: () => void;
    sudoku: () => void;
    quantumGo: () => void;
    fogChess: () => void;
  };
}

function launchForKey(
  entry: GameEntry,
  onLaunch: BrainGamesTabProps["onLaunch"]
): () => void {
  if (entry.launchKey === "chessMater") return onLaunch.chessMater;
  if (entry.launchKey === "chessTourmaster") return onLaunch.chessTourmaster;
  if (entry.launchKey === "sudoku") return onLaunch.sudoku;
  if (entry.launchKey === "quantumGo") return onLaunch.quantumGo;
  if (entry.launchKey === "fogChess") return onLaunch.fogChess;
  if (entry.launchKey === "external" && entry.externalUrl)
    return () => window.open(entry.externalUrl, "_blank");
  return () => {};
}

/**
 * 脑力训练游戏按维度分类展示
 */
export default function BrainGamesTab({ onLaunch }: BrainGamesTabProps) {
  const t = useTranslations("brainGames");
  const tDim = useTranslations("dimensions");
  const tHome = useTranslations("home");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
      <p className="text-gray-600">{t("subtitle")}</p>
      <div className="space-y-6">
        {COGNITIVE_DIMENSION_KEYS.map((dimKey) => {
          const games = GAMES_BY_DIMENSION[dimKey];
          return (
            <section key={dimKey} className="rounded-xl bg-white p-4 shadow-md">
              <h3 className="mb-3 font-semibold text-gray-800">{tDim(dimKey)}</h3>
              {games.length === 0 ? (
                <p className="text-sm text-gray-500">{t("noData")}</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {games.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={launchForKey(entry, onLaunch)}
                      className="rounded-lg bg-[#5E81AC] px-4 py-2 text-sm font-medium text-white hover:bg-[#4E719C]"
                    >
                      {tHome(entry.nameKey)} · {t("play")}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
