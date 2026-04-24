"use client";

import { useCallback } from "react";

interface RewardAmount {
  coins?: number;
  diamonds?: number;
  flowers?: number;
}

const REWARD_SOUND_SRC = "/get_reward.mp3";

export function useRewardSound() {
  return useCallback((reward?: RewardAmount | null) => {
    const hasReward =
      (reward?.coins ?? 0) > 0 || (reward?.diamonds ?? 0) > 0 || (reward?.flowers ?? 0) > 0;

    if (typeof window === "undefined" || !hasReward) return;

    const audio = new Audio(REWARD_SOUND_SRC);
    audio.volume = 0.8;
    void audio.play().catch(() => {
      // Some browsers block audio when the reward is not tied to a user gesture.
    });
  }, []);
}
