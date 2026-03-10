"use client";

import { useTranslations } from "next-intl";
import HomesteadBlock from "./HomesteadBlock";
import CheckInCalendar from "./CheckInCalendar";
import TaskList from "./TaskList";
import RadarChart from "./RadarChart";
import { useRewards } from "@/hooks/useRewards";
import { useCognitiveScores } from "@/hooks/useCognitiveScores";

interface HomeTabProps {
  username?: string;
}

/**
 * 主页 Tab 内容：家园、签到、每日/每月任务、六维雷达图（数据均来自后端）
 */
export default function HomeTab({ username = "" }: HomeTabProps) {
  const tHome = useTranslations("home");
  const {
    loading: rewardsLoading,
    coins,
    diamonds,
    checkIn,
    hasCheckedInToday,
    doCheckIn,
    dailyProgress,
    monthlyProgress,
    monthlyTarget,
    taskClaimedToday,
    monthlyClaimed,
    claimTaskReward,
  } = useRewards();
  const { scores: radarScores } = useCognitiveScores();

  if (rewardsLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#2C3539]">{tHome("welcomeUser", { username })}</h2>
        <p className="mt-1 text-gray-600">{tHome("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HomesteadBlock coins={coins} diamonds={diamonds} />
        <CheckInCalendar
          checkIn={checkIn}
          hasCheckedInToday={hasCheckedInToday}
          onCheckIn={doCheckIn}
        />
      </div>

      <TaskList
        dailyProgress={dailyProgress}
        monthlyProgress={monthlyProgress}
        monthlyTarget={monthlyTarget}
        taskClaimedToday={taskClaimedToday}
        monthlyClaimed={monthlyClaimed}
        onClaimTask={claimTaskReward}
      />

      <div className="rounded-xl bg-white p-4 shadow-md">
        <h3 className="mb-2 font-semibold text-gray-800">{tHome("radarTitle")}</h3>
        <p className="mb-4 text-sm text-gray-600">{tHome("radarSubtitle")}</p>
        <RadarChart scores={radarScores} />
      </div>
    </div>
  );
}
