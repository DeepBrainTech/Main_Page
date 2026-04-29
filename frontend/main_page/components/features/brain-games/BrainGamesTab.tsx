"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GAMES_BY_DIMENSION } from "@/config/brain-games";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import type { GameEntry } from "@/config/brain-games";
import { postGamePlayedRecord } from "@/services/userApi";
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

type FeaturedKey = "fogchess" | "quantumgo";

const FEATURED_GAMES: { key: FeaturedKey; title: string; subtitle: string }[] = [
  { key: "fogchess", title: "FogChess", subtitle: "Hidden information, pure strategy." },
  { key: "quantumgo", title: "Quantum Go", subtitle: "Uncertain moves, precise planning." },
];

const TOP_RANKING_GAMES = ["chessmater", "quantumgo", "fogchess"] as const;

const RANK_MEDAL_SRC = ["/brain-games/gold.svg", "/brain-games/silver.svg", "/brain-games/bronze.svg"] as const;

/** Featured + ranking row unified min-height (prior ~280→308, then +≈10% for breathing room). */
const FEATURE_ROW_MIN_H_PX = 339;
const CATEGORY_ORDER: (typeof COGNITIVE_DIMENSION_KEYS)[number][] = [
  "strategy",
  "spatial",
  "memory",
  "logic",
  "focus",
  "reaction",
];

const CATEGORY_META: Record<
  (typeof COGNITIVE_DIMENSION_KEYS)[number],
  { sticker: string; bgClass: string; gameTitle: string }
> = {
  memory: {
    sticker: "/brain-games/Memory.svg",
    bgClass: "from-[#59A8F0] to-[#0D5FA4]",
    gameTitle: "Memory Game",
  },
  logic: {
    sticker: "/brain-games/Logic.svg",
    bgClass: "from-[#F0B16F] to-[#CB7A12]",
    gameTitle: "Logic Game",
  },
  focus: {
    sticker: "/brain-games/Focus.svg",
    bgClass: "from-[#C37AF0] to-[#8B2BC4]",
    gameTitle: "Focus Game",
  },
  reaction: {
    sticker: "/brain-games/Reaction.svg",
    bgClass: "from-[#8DDCD2] to-[#11A68F]",
    gameTitle: "Reaction Game",
  },
  strategy: {
    sticker: "/brain-games/Chess.svg",
    bgClass: "from-[#DFC267] to-[#B38813]",
    gameTitle: "Strategy Game",
  },
  spatial: {
    sticker: "/brain-games/Spatial.svg",
    bgClass: "from-[#E45B43] to-[#9F1508]",
    gameTitle: "Spatial Game",
  },
};

function launchForKey(
  entry: GameEntry,
  onLaunch: BrainGamesTabProps["onLaunch"]
): () => void {
  if (entry.launchKey === "chessMater") return onLaunch.chessMater;
  if (entry.launchKey === "chessTourmaster") return onLaunch.chessTourmaster;
  if (entry.launchKey === "sudoku") return onLaunch.sudoku;
  if (entry.launchKey === "quantumGo") return onLaunch.quantumGo;
  if (entry.launchKey === "fogChess") return onLaunch.fogChess;
  if (entry.launchKey === "external" && entry.externalUrl) {
    return () => {
      void postGamePlayedRecord(entry.key).catch(() => {
        /* open game even if record fails */
      });
      window.open(entry.externalUrl, "_blank");
    };
  }
  return () => {};
}

/**
 * Brain games tab with featured carousel and category explorer.
 */
export default function BrainGamesTab({ onLaunch }: BrainGamesTabProps) {
  const tHome = useTranslations("dashboard");
  const [activeCategory, setActiveCategory] = useState<(typeof COGNITIVE_DIMENSION_KEYS)[number]>("strategy");
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % FEATURED_GAMES.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const selectedGames = GAMES_BY_DIMENSION[activeCategory] ?? [];

  return (
    <div className="space-y-5 pb-8 font-['Outfit']">
      <section className="flex flex-col gap-3 lg:flex-row lg:gap-4 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-[1.89] flex-col gap-2">
          <h2 className="text-[22px] font-semibold text-[#106FAA]">New In</h2>
          <div
            className="relative flex min-h-[308px] flex-1 flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ minHeight: FEATURE_ROW_MIN_H_PX }}
          >
            {FEATURED_GAMES.map((feature, idx) => {
              const imageSrc = GAME_COVER_MAP[feature.key];
              const isActive = idx === featuredIndex;
              const launchEntry = GAMES_BY_DIMENSION.strategy.find((entry) => entry.key === feature.key);
              return (
                <div
                  key={feature.key}
                  className={`absolute inset-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6 transition-opacity duration-700 ${
                    isActive ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col justify-center bg-[#F6FAFE] sm:rounded-2xl sm:px-2 sm:py-1">
                    <span className="inline-flex w-fit rounded-full bg-[#EDF4FC] px-4 py-1.5 text-[14px] font-semibold text-[#045E96]">
                      Strategy Game
                    </span>
                    <h3 className="mt-2 font-['Titan_One'] text-[40px] leading-[1.1] text-[#045E96] sm:text-[48px] sm:leading-[60px]">
                      {feature.key === "fogchess" ? "Fog of War" : "Quantum Go"}
                    </h3>
                    <p className="mt-3 max-w-[420px] text-[16px] leading-5 text-[#106FAA]">
                      Game intro Game introGame introGame introGame introGame introGame introGame introGame
                      introGame introGame introGame introGame intro
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {launchEntry ? (
                        <button
                          type="button"
                          onClick={launchForKey(launchEntry, onLaunch)}
                          className="h-[45px] min-w-[125px] rounded-full bg-[#045E96] px-6 text-[16px] font-semibold text-white shadow-[0px_3.2px_4.8px_rgba(4,94,150,0.3)]"
                        >
                          Play Now
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="h-[45px] min-w-[129px] rounded-full bg-[#DDEDFF] px-6 text-[16px] font-semibold text-[#045E96]"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                  <div className="pointer-events-none relative mx-auto h-[220px] w-full max-w-[381px] shrink-0 overflow-hidden rounded-[24px] bg-slate-100 sm:mx-0 sm:h-[246px] sm:w-[min(42%,381px)]">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={feature.key}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div className="absolute right-5 top-4 z-10 flex gap-1.5">
              {FEATURED_GAMES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === featuredIndex ? "w-7 bg-[#7eb6dd]" : "w-4 bg-[#c8dff1]"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-[260px] flex-1 flex-col gap-2 lg:max-w-none">
          <h2 className="text-[22px] font-semibold text-[#106FAA]">Top Ranking Games</h2>
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
            {TOP_RANKING_GAMES.map((gameKey, index) => {
              const rankingEntry = GAMES_BY_DIMENSION.strategy.find((entry) => entry.key === gameKey);
              const imageSrc = GAME_COVER_MAP[gameKey];
              if (!rankingEntry) return null;

              return (
                <button
                  key={gameKey}
                  type="button"
                  onClick={launchForKey(rankingEntry, onLaunch)}
                  className="flex w-full shrink-0 items-center gap-3 rounded-[16px] border border-white/80 bg-white p-3 text-left shadow-[0px_10px_15px_0px_rgba(0,0,0,0.10)] transition hover:translate-y-[-1px]"
                >
                  <div className="relative h-8 w-8 shrink-0">
                    <Image
                      src={RANK_MEDAL_SRC[index]}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="relative h-[50px] w-[68px] shrink-0 overflow-hidden rounded-[10px] bg-slate-200">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={tHome(rankingEntry.nameKey)}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {rankingEntry.key === "fogchess" ? "Fog of War" : tHome(rankingEntry.nameKey)}
                    </p>
                  </div>
                  <span className="ml-auto text-xl text-[#0B6FB4]">›</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[22px] font-semibold text-[#106FAA]">Game Categories</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 pt-6 md:grid-cols-3 xl:grid-cols-6">
        {CATEGORY_ORDER.map((dimKey) => {
          const meta = CATEGORY_META[dimKey];
          const isActive = activeCategory === dimKey;
          return (
            <button
              key={dimKey}
              type="button"
              onClick={() => setActiveCategory(dimKey)}
              className={`group relative w-full cursor-pointer overflow-visible text-left outline-none transition ${
                isActive ? "" : "hover:-translate-y-0.5"
              }`}
            >
              {/* 贴图层：独立于色块之上，溢出到网格空隙；不接收点击 */}
              <div className="pointer-events-none relative z-20 ml-auto mr-2 flex h-[108px] w-[112px] -mb-[60px] translate-y-1 items-end justify-center drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]">
                {dimKey === "memory" ? (
                  <div className="relative h-[100px] w-full max-w-[112px]">
                    <Image
                      src={meta.sticker}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="120px"
                    />
                    <div className="absolute bottom-0 right-1 z-10 h-[88px] w-[78px] rotate-[8deg] -scale-x-100 opacity-90">
                      <Image
                        src={meta.sticker}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="88px"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[100px] w-[100px]">
                    <Image
                      src={meta.sticker}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="108px"
                    />
                  </div>
                )}
              </div>

              {/* 渐变色块：贴纸负 margin 叠上来，看起来像「压住」下边条 */}
              <div
                className={`relative z-10 flex min-h-[118px] flex-col justify-end rounded-[21.75px] border-[0.75px] border-white/60 bg-gradient-to-b px-4 pb-4 pt-11 text-white shadow-[0px_7.25px_10.877px_0px_rgba(0,0,0,0.1),0px_2.9px_4.351px_0px_rgba(0,0,0,0.1)] ${meta.bgClass} ${
                  isActive ? "ring-2 ring-sky-200 ring-offset-2 ring-offset-slate-100/80" : ""
                }`}
              >
                <h3 className="text-[16px] font-semibold leading-snug">{meta.gameTitle}</h3>
              </div>
            </button>
          );
        })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[22px] font-semibold text-[#106FAA]">{CATEGORY_META[activeCategory].gameTitle.replace("Game", "Games")}</h2>

        {selectedGames.length === 0 ? (
          <p className="rounded-2xl bg-[#EDF4FC] px-4 py-6 text-sm text-slate-500">
            Games for this category are coming soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {selectedGames.map((entry) => {
              const imageSrc = entry.skipCover
                ? null
                : (GAME_COVER_MAP[entry.key] ?? `/brain-games/${entry.key}.gif`);
              const playerText = entry.key === "quantumgo" || entry.key === "fogchess" ? "1-2 Players" : "1 Player";
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={launchForKey(entry, onLaunch)}
                  className="rounded-[32px] border border-white/60 bg-white/90 p-[15px] text-left shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition hover:translate-y-[-2px]"
                >
                  <div className="relative mx-auto h-[217px] w-full max-w-[344px] overflow-hidden rounded-[24px] bg-slate-200">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={tHome(entry.nameKey)}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className="truncate font-['Titan_One'] text-[20px] leading-snug text-[#045E96]">
                        {entry.key === "fogchess" ? "Fog of War" : tHome(entry.nameKey)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[14px] leading-5 text-[#106FAA]">
                        <span className="inline-flex h-[18px] w-[18px] shrink-0 text-[#106FAA]" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" stroke="currentColor" strokeWidth="1.6">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </span>
                        <span>{playerText}</span>
                      </div>
                    </div>
                    <span className="mt-0.5 inline-flex h-[33px] shrink-0 items-center justify-center rounded-full bg-[#DDEDFF] px-6 text-[14px] font-medium text-[#045E96]">
                      Play Now
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
