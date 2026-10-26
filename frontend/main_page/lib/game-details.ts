import { GAMES_BY_DIMENSION, type GameEntry } from "@/config/brain-games";

export function getGameDetailSlug(gameKey: string): string {
  return gameKey === "chessmater" ? "freefall-chess" : gameKey;
}

export function getGameDetailHref(gameKey: string): string {
  return `/braingames/${getGameDetailSlug(gameKey)}`;
}

export function findGameDetail(slug: string): { entry: GameEntry; dimension: string } | undefined {
  for (const [dimension, entries] of Object.entries(GAMES_BY_DIMENSION)) {
    const entry = entries.find((game) => getGameDetailSlug(game.key) === slug);
    if (entry) return { entry, dimension };
  }
}
