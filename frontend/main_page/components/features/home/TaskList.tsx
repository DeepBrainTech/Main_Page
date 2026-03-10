"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DAILY_TASKS, MONTHLY_TASK, type TaskConfig } from "@/config/tasks";

interface TaskListProps {
  dailyProgress: Record<string, number>;
  monthlyProgress: { count: number; month: string };
  monthlyTarget: number;
  taskClaimedToday: Set<string>;
  monthlyClaimed: boolean;
  onClaimTask: (taskId: string) => Promise<void>;
}

function TaskRow({
  task,
  current,
  target,
  rewardText,
  done,
  claimed,
  onClaim,
}: {
  task: TaskConfig;
  current: number;
  target: number;
  rewardText: string;
  done: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
  const tHome = useTranslations("home");
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 py-2 px-3">
      <span className="text-sm text-gray-800">{tTasks(task.labelKey)}</span>
      <div className="flex items-center gap-2">
        {target > 0 ? (
          <span className="text-xs text-gray-500">
            {tHome("taskProgress", { current: String(current), target: String(target) })}
          </span>
        ) : null}
        <span className="text-xs text-amber-600">{rewardText}</span>
        {done && !claimed && ((task.rewardCoins ?? 0) > 0 || (task.rewardDiamonds ?? 0) > 0) ? (
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="rounded bg-amber-500 px-2 py-0.5 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {claiming ? tCommon("loading") : tCommon("claim")}
          </button>
        ) : null}
        {done && claimed ? (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
            {tHome("taskDone")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 每日任务（3 个）+ 每月任务（1 个），支持领取奖励（调后端）
 */
export default function TaskList({
  dailyProgress,
  monthlyProgress,
  monthlyTarget,
  taskClaimedToday,
  monthlyClaimed,
  onClaimTask,
}: TaskListProps) {
  const tHome = useTranslations("home");
  const tTasks = useTranslations("tasks");
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyCount = monthlyProgress.month === thisMonth ? monthlyProgress.count : 0;

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-md">
      <h3 className="font-semibold text-gray-800">{tHome("dailyTasks")}</h3>
      <div className="space-y-2">
        {DAILY_TASKS.map((task) => {
          const current = dailyProgress[task.id] ?? 0;
          const target = task.targetCount ?? 1;
          const done = target > 0 ? current >= target : false;
          const rewardText = task.rewardCoins
            ? tTasks("rewardCoins", { count: task.rewardCoins })
            : "";
          const claimed = taskClaimedToday.has(task.id);
          return (
            <TaskRow
              key={task.id}
              task={task}
              current={current}
              target={target}
              rewardText={rewardText}
              done={done}
              claimed={claimed}
              onClaim={() => onClaimTask(task.id)}
            />
          );
        })}
      </div>
      <h3 className="mt-4 font-semibold text-gray-800">{tHome("monthlyTask")}</h3>
      <TaskRow
        task={MONTHLY_TASK}
        current={monthlyCount}
        target={monthlyTarget}
        rewardText={tTasks("rewardDiamonds", { count: MONTHLY_TASK.rewardDiamonds ?? 10 })}
        done={monthlyCount >= monthlyTarget}
        claimed={monthlyClaimed}
        onClaim={() => onClaimTask("monthly-1")}
      />
    </div>
  );
}
