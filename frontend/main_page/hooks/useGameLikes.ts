"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type GameLikeState,
  fetchGameLikes,
  likeGame,
  unlikeGame,
} from "@/services/userApi";

function likesMapFromStates(states: GameLikeState[]): Map<string, { count: number; likedByMe: boolean }> {
  const m = new Map<string, { count: number; likedByMe: boolean }>();
  for (const s of states) {
    m.set(s.game_key, { count: s.like_count, likedByMe: s.liked_by_me });
  }
  return m;
}

/**
 * Loads per-game like counts and liked-by-me flags; toggle updates backend and local map.
 * Card UI can omit controls while ranking or other pages still consume `likeStates` / `toggleGameLike`.
 */
export function useGameLikes() {
  const [likeStates, setLikeStates] = useState<Map<string, { count: number; likedByMe: boolean }>>(
    () => new Map()
  );
  const [likeBusyKey, setLikeBusyKey] = useState<string | null>(null);

  const applyLikesList = useCallback((list: GameLikeState[]) => {
    setLikeStates(likesMapFromStates(list));
  }, []);

  const reloadLikesFromApi = useCallback(async () => {
    try {
      applyLikesList(await fetchGameLikes());
    } catch {
      /* network / auth — leave previous map */
    }
  }, [applyLikesList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchGameLikes();
        if (!cancelled) applyLikesList(list);
      } catch {
        /* Guest or error — ribbons stay at zeros */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyLikesList]);

  const toggleGameLike = useCallback(
    async (gameKey: string, currentlyLiked: boolean) => {
      setLikeBusyKey(gameKey);
      try {
        /* Backend commits row then returns full `likes[]` rebuilt from DB (same shape as GET). */
        const list = currentlyLiked ? await unlikeGame(gameKey) : await likeGame(gameKey);
        applyLikesList(list);
      } catch {
        await reloadLikesFromApi();
      } finally {
        setLikeBusyKey(null);
      }
    },
    [applyLikesList, reloadLikesFromApi]
  );

  return { likeStates, likeBusyKey, reloadLikesFromApi, toggleGameLike };
}
