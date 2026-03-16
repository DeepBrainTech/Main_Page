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
 * 主页 Tab 内容：Bento Grid 布局
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

  // 临时经验模型：用于首页经验条效果展示，后续可替换为后端真实 xp 字段。
  const totalExp = coins + diamonds * 10;
  const expPerLevel = 120;
  const level = Math.max(1, Math.floor(totalExp / expPerLevel) + 1);
  const expCurrent = totalExp % expPerLevel;
  const expTarget = expPerLevel;

  if (rewardsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      {/* Bento Grid 布局 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 左上：家园 (跨 8 列) */}
        <div className="md:col-span-8 min-h-[200px]">
          <HomesteadBlock
            coins={coins}
            diamonds={diamonds}
            level={level}
            expCurrent={expCurrent}
            expTarget={expTarget}
          />
        </div>
        
        {/* 右上：签到 (跨 4 列) */}
        <div className="md:col-span-4 min-h-[200px]">
          <CheckInCalendar
            checkIn={checkIn}
            hasCheckedInToday={hasCheckedInToday}
            onCheckIn={doCheckIn}
          />
        </div>

        {/* 左下：任务列表 (跨 7 列) */}
        <div className="md:col-span-7">
          <TaskList
            dailyProgress={dailyProgress}
            monthlyProgress={monthlyProgress}
            monthlyTarget={monthlyTarget}
            taskClaimedToday={taskClaimedToday}
            monthlyClaimed={monthlyClaimed}
            onClaimTask={claimTaskReward}
          />
        </div>

        {/* 右下：雷达图 (跨 5 列) */}
        <div className="md:col-span-5">
          <RadarChart scores={radarScores} />
        </div>
      </div>
    </div>
  );
}
