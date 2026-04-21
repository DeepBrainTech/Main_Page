"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GAMES_BY_DIMENSION } from "@/config/brain-games";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import type { GameEntry } from "@/config/brain-games";
import {
  fetchGameLikes,
  likeGame,
  unlikeGame,
  type GameLikeState,
} from "@/services/userApi";
import chessmaterGif from "../../../public/brain-games/chessmater.gif";
import sudokuGif from "../../../public/brain-games/sudoku.gif";
import chessTourmasterGif from "../../../public/brain-games/chessTourmaster.gif";
import quantumGoGif from "../../../public/brain-games/quantumgo.gif";
import fogChessGif from "../../../public/brain-games/fogchess.gif";
import intercontinentalChessGif from "../../../public/brain-games/intercontinental-chess.gif";

const GAME_COVER_MAP: Record<string, string | StaticImageData> = {
  chessmater: chessmaterGif,
  sudoku: sudokuGif,
  "chess-tourmaster": chessTourmasterGif,
  quantumgo: quantumGoGif,
  fogchess: fogChessGif,
  "intercontinental-chess": intercontinentalChessGif,
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
 * Brain training games grouped by dimension
 */
export default function BrainGamesTab({ onLaunch }: BrainGamesTabProps) {
  const t = useTranslations("brainGames");
  const tDim = useTranslations("dimensions");
  const tHome = useTranslations("dashboard");
  const [likes, setLikes] = useState<GameLikeState[]>([]);
  const [pendingLikeKey, setPendingLikeKey] = useState<string | null>(null);
  const [hoveredLikeKey, setHoveredLikeKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchGameLikes()
      .then((items) => {
        if (mounted) setLikes(items);
      })
      .catch(() => {
        if (mounted) setLikes([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const likeMap = useMemo(
    () =>
      likes.reduce<Record<string, GameLikeState>>((acc, item) => {
        acc[item.game_key] = item;
        return acc;
      }, {}),
    [likes]
  );

  const handleToggleLike = async (gameKey: string, likedByMe: boolean) => {
    if (pendingLikeKey) return;
    setPendingLikeKey(gameKey);
    try {
      const updated = likedByMe ? await unlikeGame(gameKey) : await likeGame(gameKey);
      setLikes(updated);
    } catch {
      // ignore and keep previous UI state
    } finally {
      setPendingLikeKey(null);
    }
  };

  const formatLikeCount = (count: number) =>
    new Intl.NumberFormat("en", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(count);

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
                    const imageSrc = entry.skipCover
                      ? null
                      : (GAME_COVER_MAP[entry.key] ??
                        `/brain-games/${entry.key}.gif`); // Other games use static public assets

                    return (
                      <div
                        key={entry.key}
                        onClick={launchForKey(entry, onLaunch)}
                        className="flex w-40 cursor-pointer flex-col items-center rounded-lg bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-2 h-24 w-full overflow-hidden rounded-md bg-gray-200">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={tHome(entry.nameKey)}
                              width={160}
                              height={96}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-gray-800 text-center">
                          {tHome(entry.nameKey)}
                        </span>
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredLikeKey(entry.key)}
                          onMouseLeave={() => setHoveredLikeKey((prev) => (prev === entry.key ? null : prev))}
                          onClick={(event) => {
                            event.stopPropagation();
                            const likedByMe = likeMap[entry.key]?.liked_by_me ?? false;
                            handleToggleLike(entry.key, likedByMe);
                          }}
                          disabled={pendingLikeKey === entry.key}
                          className={`mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors transition-shadow ${
                            likeMap[entry.key]?.liked_by_me
                              ? "border-rose-300 bg-white text-rose-600 hover:bg-rose-50 hover:shadow-sm"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm"
                          }`}
                        >
                          <span
                            className={`rounded-full px-1.5 py-0.5 leading-none ${
                              likeMap[entry.key]?.liked_by_me ? "bg-rose-50" : "bg-slate-100"
                            }`}
                          >
                            {"\u2764"}
                          </span>
                          <span>
                            {hoveredLikeKey === entry.key
                              ? "Like"
                              : formatLikeCount(likeMap[entry.key]?.like_count ?? 0)}
                          </span>
                        </button>
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
