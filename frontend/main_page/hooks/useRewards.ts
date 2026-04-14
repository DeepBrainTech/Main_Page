"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRewards, postCheckIn, claimTask, type RewardsData } from "@/services/userApi";

/** 签到记录（由后端返回的 check_in_dates 等推导） */
export interface CheckInState {
  dates: string[];
  lastDate: string | null;
  streak: number;
}

/**
 * 金币/钻石/鲜花、签到、任务进度：全部从后端 API 获取，无 localStorage
 */
export function useRewards() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { background?: boolean }) => {
    const shouldBackgroundRefresh = options?.background === true || data !== null;
    if (shouldBackgroundRefresh) {
      // 已有数据时走后台刷新，避免整块 UI 切到 Loading 造成闪屏。
      setRefreshing(true);
    } else {
      // 首次加载仍保留整体 Loading 态。
      setLoading(true);
    }
    setError(null);
    try {
      const next = await fetchRewards();
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

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

  const doCheckIn = useCallback(async () => {
    if (hasCheckedInToday) return;
    try {
      await postCheckIn();
      await load({ background: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "check_in_failed");
    }
  }, [hasCheckedInToday, load]);

  const claimTaskReward = useCallback(
    async (taskId: string) => {
      try {
        await claimTask(taskId);
        await load({ background: true });
      } catch (e) {
        throw e;
      }
    },
    [load]
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
    claimTaskReward,
    refresh: load,
  };
}
