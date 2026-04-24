"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRewards, postCheckIn, claimTask, type RewardsData } from "@/services/userApi";
import { useRewardSound } from "@/hooks/useRewardSound";

const REWARDS_UPDATED_EVENT = "main-page:rewards-updated";

/** 签到记录（由后端返回的 check_in_dates 等推导） */
export interface CheckInState {
  dates: string[];
  lastDate: string | null;
  streak: number;
}

export interface CheckInResult {
  coins: number;
  diamonds: number;
  flowers: number;
  streakAfter: number;
}

/**
 * 金币/钻石/鲜花、签到、任务进度：全部从后端 API 获取，无 localStorage
 */
export function useRewards() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  const playRewardSound = useRewardSound();

  const load = useCallback(async (options?: { background?: boolean }) => {
    const shouldBackgroundRefresh = options?.background === true || hasLoadedRef.current;
    if (shouldBackgroundRefresh) {
      // 已有数据时走后台刷新，避免整块 UI 切到 Loading 造成闪屏。
      setRefreshing(true);
    } else {
      // 首次加载仍保留整体 Loading 态。
      setLoading(true);
    }
    setError(null);
    let nextData: RewardsData | null = null;
    try {
      const next = await fetchRewards();
      setData(next);
      hasLoadedRef.current = true;
      nextData = next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    return nextData;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleRewardsUpdated = (event: Event) => {
      const sourceId = event instanceof CustomEvent ? event.detail?.sourceId : null;
      if (sourceId === instanceIdRef.current) return;
      void load({ background: true });
    };

    window.addEventListener(REWARDS_UPDATED_EVENT, handleRewardsUpdated);
    return () => window.removeEventListener(REWARDS_UPDATED_EVENT, handleRewardsUpdated);
  }, [load]);

  const notifyRewardsUpdated = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(REWARDS_UPDATED_EVENT, {
        detail: { sourceId: instanceIdRef.current },
      })
    );
  }, []);

  const coins = data?.coins ?? 0;
  const diamonds = data?.diamonds ?? 0;
  const flowers = data?.flowers ?? 0;
  const checkIn: CheckInState = data
    ? {
        dates: data.check_in_dates ?? [],
        lastDate: data.check_in_dates?.length ? data.check_in_dates[data.check_in_dates.length - 1] : null,
        streak: data.current_streak ?? 0,
      }
    : { dates: [], lastDate: null, streak: 0 };
  const hasCheckedInToday = data?.has_checked_in_today ?? false;
  const dailyProgress = data?.daily_progress ?? {};
  const monthlyProgress = data
    ? { count: data.monthly_progress ?? 0, month: new Date().toISOString().slice(0, 7) }
    : { count: 0, month: "" };
  const taskClaimedToday = new Set(data?.task_claimed_today ?? []);
  const monthlyClaimed = data?.monthly_claimed ?? false;
  const playedGameCount = data?.played_game_count ?? 0;

  const doCheckIn = useCallback(async (): Promise<CheckInResult | null> => {
    if (hasCheckedInToday) return null;
    try {
      const award = await postCheckIn();
      playRewardSound(award);
      const refreshed = await load({ background: true });
      notifyRewardsUpdated();
      return {
        ...award,
        streakAfter: refreshed?.current_streak ?? 0,
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "check_in_failed");
      return null;
    }
  }, [hasCheckedInToday, load, notifyRewardsUpdated, playRewardSound]);

  const claimTaskReward = useCallback(
    async (taskId: string) => {
      try {
        const award = await claimTask(taskId);
        playRewardSound(award);
        await load({ background: true });
        notifyRewardsUpdated();
      } catch (e) {
        throw e;
      }
    },
    [load, notifyRewardsUpdated, playRewardSound]
  );

  return {
    loading,
    refreshing,
    error,
    coins,
    diamonds,
    flowers,
    checkIn,
    hasCheckedInToday,
    doCheckIn,
    dailyProgress,
    monthlyProgress,
    monthlyTarget: data?.monthly_target ?? 20,
    taskClaimedToday,
    monthlyClaimed,
    playedGameCount,
    claimTaskReward,
    refresh: load,
  };
}
