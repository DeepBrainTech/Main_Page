"use client";

import { useEffect, useState } from "react";
import { fetchGameMedia } from "@/services/gameMediaApi";
import type { GameMedia } from "@/types/gameMedia";

export function useGameMedia(slug: string) {
  const [state, setState] = useState<{ slug: string; media: GameMedia; loading: boolean; error: boolean }>({
    slug, media: { previews: [], tutorials: [] }, loading: true, error: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ slug, media: { previews: [], tutorials: [] }, loading: true, error: false });
    void fetchGameMedia(slug, controller.signal).then(
      (media) => { if (!controller.signal.aborted) setState({ slug, media, loading: false, error: false }); },
      () => { if (!controller.signal.aborted) setState({ slug, media: { previews: [], tutorials: [] }, loading: false, error: true }); },
    );
    return () => controller.abort();
  }, [slug, attempt]);

  return {
    ...(state.slug === slug ? state : { media: { previews: [], tutorials: [] }, loading: true, error: false }),
    retry: () => setAttempt((value) => value + 1),
  };
}
