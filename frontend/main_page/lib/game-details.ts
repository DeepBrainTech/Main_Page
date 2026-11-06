import { GAMES_BY_DIMENSION, type GameEntry } from "@/config/brain-games";
import type { CognitiveDimensionKey } from "@/types/cognitive";

export function getGameDetailSlug(gameKey: string): string {
  return gameKey === "chessmater" ? "freefall-chess" : gameKey;
}

export function getGameDetailHref(gameKey: string, category?: CognitiveDimensionKey | null): string {
  const href = `/braingames/${getGameDetailSlug(gameKey)}`;
  return category ? `${href}?category=${category}` : href;
}

export function findGameDetail(slug: string): { entry: GameEntry; dimension: string } | undefined {
  for (const [dimension, entries] of Object.entries(GAMES_BY_DIMENSION)) {
    const entry = entries.find((game) => getGameDetailSlug(game.key) === slug);
    if (entry) return { entry, dimension };
  }
}
