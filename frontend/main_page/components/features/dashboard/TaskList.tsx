"use client";

import { useState } from "react";
import Image from "next/image";
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
  done,
  claimed,
  onClaim,
}: {
  task: TaskConfig;
  current: number;
  target: number;
  done: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
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

  const rewardValue = task.rewardCoins ?? task.rewardDiamonds ?? 0;
  const isCoinReward = (task.rewardCoins ?? 0) > 0;
  const rewardIcon = isCoinReward ? "/dashboard/coin.svg" : "/dashboard/dimond.svg";
  const rewardBg = done ? "bg-green-500" : "bg-red-500";
  const statusBorder = done ? "outline-green-400" : "outline-black/0";
  const statusBg = done ? "bg-emerald-100" : "bg-indigo-50";
  const textColor = done ? "text-green-500 line-through" : "text-sky-700";

  return (
    <div className={`w-full rounded-[20.52px] px-4 py-3 outline outline-2 outline-offset-[-2.05px] ${statusBg} ${statusBorder}`}>
      <div className="flex items-center gap-4">
        <div className="inline-flex h-6 w-6 items-center justify-center">
          <Image
            src={done ? "/dashboard/checkin_icon.svg" : "/dashboard/nocheckin_icon.svg"}
            alt={done ? "done" : "pending"}
            width={15}
            height={15}
            className="h-3.5 w-3.5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className={`truncate text-base font-medium font-['Outfit'] leading-6 ${textColor}`}>
            {tTasks(task.labelKey)}
          </div>
          <div className="mt-1 text-xs font-medium font-['Outfit'] text-sky-700/70">
            {current}/{target}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center justify-center gap-1 rounded-[102.62px] px-3 py-1.5 ${rewardBg}`}>
            <Image src={rewardIcon} alt="reward" width={14} height={14} className="h-3.5 w-3.5" />
            <span className="text-center text-base font-medium font-['Outfit'] leading-5 text-white">{rewardValue}</span>
          </div>

          {done && !claimed ? (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="rounded-[102.62px] bg-[#E45C44] px-3 py-1.5 text-xs font-medium font-['Outfit'] text-white disabled:opacity-50"
            >
              {claiming ? tCommon("loading") : tCommon("claim")}
            </button>
          ) : null}

          {claimed ? (
            <span className="rounded-[102.62px] bg-green-500 px-3 py-1.5 text-xs font-medium font-['Outfit'] text-white">
              {tTasks("statusCompleted")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getMonthDateRange(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${month}.1-${month}.${lastDay}`;
}

export default function TaskList({
  dailyProgress,
  monthlyProgress,
  monthlyTarget,
  taskClaimedToday,
  monthlyClaimed,
  onClaimTask,
}: TaskListProps) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyCount = monthlyProgress.month === thisMonth ? monthlyProgress.count : 0;
  const monthDateRange = getMonthDateRange();

  const dailyDoneCount = DAILY_TASKS.filter((task) => {
    const current = dailyProgress[task.id] ?? 0;
    const target = task.targetCount ?? 1;
    return target > 0 && current >= target;
  }).length;

  const monthlyDone = monthlyCount >= monthlyTarget ? 1 : 0;
  const totalCompleted = dailyDoneCount + monthlyDone;
  const totalGoals = DAILY_TASKS.length + 1;

  return (
    <div className="inline-flex h-full w-full flex-col items-start gap-6 rounded-[32.84px] bg-white/60 px-8 pt-8 shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1.03px] outline-white/60">
      <div className="inline-flex h-10 w-full items-center justify-between">
        <h3 className="text-2xl font-normal font-['Titan_One'] leading-8 tracking-wide text-sky-700">Brain Hub</h3>
        <div className="flex items-center justify-center gap-1.5 rounded-[102.62px] bg-blue-100 px-2.5 py-2">
          <span className="text-base font-medium font-['Outfit'] leading-6 text-sky-700">
            {totalCompleted}/{totalGoals} Completed
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-5">
          <div className="text-lg font-semibold font-['Outfit'] leading-5 text-sky-700">
            Daily Goals ({dailyDoneCount}/{DAILY_TASKS.length})
          </div>
          <div className="flex w-full flex-col gap-3">
            {DAILY_TASKS.map((task) => {
              const current = dailyProgress[task.id] ?? 0;
              const target = task.targetCount ?? 1;
              const done = target > 0 ? current >= target : false;
              const claimed = taskClaimedToday.has(task.id);
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  current={current}
                  target={target}
                  done={done}
                  claimed={claimed}
                  onClaim={() => onClaimTask(task.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-5">
          <div className="text-lg font-semibold font-['Outfit'] leading-5 text-sky-700">Monthly Goals ({monthlyDone}/1)</div>
          <div className="text-xs font-medium font-['Outfit'] text-sky-700/70">{monthDateRange}</div>
          <div className="flex w-full flex-col gap-3">
            <TaskRow
              task={MONTHLY_TASK}
              current={monthlyCount}
              target={monthlyTarget}
              done={monthlyDone === 1}
              claimed={monthlyClaimed}
              onClaim={() => onClaimTask("monthly-1")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
