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
  isLast = false,
}: {
  task: TaskConfig;
  current: number;
  target: number;
  rewardText: string;
  done: boolean;
  claimed: boolean;
  onClaim: () => void;
  isLast?: boolean;
}) {
  const tHome = useTranslations("dashboard");
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

  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className={`group flex items-center justify-between py-3 ${!isLast ? "border-b border-gray-50" : ""}`}>
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1.5">
           <span className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-700"}`}>
             {tTasks(task.labelKey)}
           </span>
           {claimed && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{tTasks("statusCompleted")}</span>}
        </div>
        
        {target > 0 && (
          <div className="w-full max-w-[140px]">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{tHome("taskProgress", { current: String(current), target: String(target) })}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-400" : "bg-indigo-400"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {rewardText}
        </span>
        
        {done && !claimed && ((task.rewardCoins ?? 0) > 0 || (task.rewardDiamonds ?? 0) > 0) && (
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="mt-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? tCommon("loading") : tCommon("claim")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Current month date range */
function getMonthDateRange(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${month}.1-${month}.${lastDay}`;
}

/**
 * Task list with cleaner list-style UI
 */
export default function TaskList({
  dailyProgress,
  monthlyProgress,
  monthlyTarget,
  taskClaimedToday,
  monthlyClaimed,
  onClaimTask,
}: TaskListProps) {
  const tHome = useTranslations("dashboard");
  const tTasks = useTranslations("tasks");
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyCount = monthlyProgress.month === thisMonth ? monthlyProgress.count : 0;
  const monthDateRange = getMonthDateRange();

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-bold text-gray-800">{tHome("dailyTasks")}</h3>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{tHome("dailyLabel")}</span>
      </div>
      
      <div className="mb-6">
        {DAILY_TASKS.map((task, idx) => {
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
              isLast={idx === DAILY_TASKS.length - 1}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4 pt-2 border-t border-gray-100">
         <h3 className="font-bold text-gray-800">{tHome("monthlyTask")}</h3>
         <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">{monthDateRange}</span>
      </div>
      
      <TaskRow
        task={MONTHLY_TASK}
        current={monthlyCount}
        target={monthlyTarget}
        rewardText={tTasks("rewardDiamonds", { count: MONTHLY_TASK.rewardDiamonds ?? 10 })}
        done={monthlyCount >= monthlyTarget}
        claimed={monthlyClaimed}
        onClaim={() => onClaimTask("monthly-1")}
        isLast={true}
      />
    </div>
  );
}
