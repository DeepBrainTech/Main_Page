"use client";

import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import { GAMES_BY_DIMENSION } from "@/config/brain-games";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import type { GameEntry } from "@/config/brain-games";
import chessmaterGif from "../../../public/brain-games/chessmater.gif";
import sudokuGif from "../../../public/brain-games/sudoku.gif";
import chessTourmasterGif from "../../../public/brain-games/chessTourmaster.gif";
import quantumGoGif from "../../../public/brain-games/quantumgo.gif";
import fogChessGif from "../../../public/brain-games/fogchess.gif";

const GAME_COVER_MAP: Record<string, string | StaticImageData> = {
  chessmater: chessmaterGif,
  sudoku: sudokuGif,
  "chess-tourmaster": chessTourmasterGif,
  quantumgo: quantumGoGif,
  fogchess: fogChessGif,
};

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
                <div className="flex flex-wrap gap-4">
                  {games.map((entry) => {
                    const imageSrc =
                      GAME_COVER_MAP[entry.key] ??
                      `/brain-games/${entry.key}.gif`; // 其他游戏走 public 静态路径

                    return (
                      <div
                        key={entry.key}
                        onClick={launchForKey(entry, onLaunch)}
                        className="flex w-40 cursor-pointer flex-col items-center rounded-lg bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-2 h-24 w-full overflow-hidden rounded-md bg-gray-200">
                          <Image
                            src={imageSrc}
                            alt={tHome(entry.nameKey)}
                            width={160}
                            height={96}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-800 text-center">
                          {tHome(entry.nameKey)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
