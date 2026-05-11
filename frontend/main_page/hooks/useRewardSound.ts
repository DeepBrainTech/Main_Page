"use client";

import { useCallback } from "react";
import { playUiSound } from "@/lib/ui-sound";

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

    playUiSound(REWARD_SOUND_SRC, 0.8);
  }, []);
}
