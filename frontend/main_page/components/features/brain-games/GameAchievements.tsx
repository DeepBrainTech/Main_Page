import Image from "next/image";
import { useTranslations } from "next-intl";
import { GAME_ACHIEVEMENT_GROUPS, GAME_ACHIEVEMENT_RULES } from "@/config/game-achievements";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";
import type { GameAchievementProgress } from "@/types/gameAchievements";

interface GameAchievementsProps {
  gameKey: string;
  progress?: GameAchievementProgress;
}

function isAchievementUnlocked(value: number | undefined, target: number | undefined) {
  return target !== undefined && value !== undefined && Number.isFinite(value) && value >= target;
}

export default function GameAchievements({ gameKey, progress }: GameAchievementsProps) {
  const t = useTranslations("gameDetails");
  const rules = GAME_ACHIEVEMENT_RULES[gameKey];
  const values = progress?.gameKey === gameKey ? progress.values : undefined;
  const hasProgress = values !== undefined;
  const totalAchievements = GAME_ACHIEVEMENT_GROUPS.reduce(
    (total, group) => total + (rules?.[group.key]?.targets.length ?? 0), 0,
  );
  const unlockedAchievements = GAME_ACHIEVEMENT_GROUPS.reduce(
    (total, group) => total + (rules?.[group.key]?.targets.filter(
      (target) => isAchievementUnlocked(values?.[group.key], target),
    ).length ?? 0), 0,
  );
  return (
    <section className={`${dashboardCardClass} font-app-body p-6 sm:p-8 xl:p-12`} aria-labelledby="achievements-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="achievements-title" className="font-['Titan_One'] text-xl leading-8">{t("achievements")}</h2>
        {rules && totalAchievements > 0 && (
          <div className="flex w-full min-w-0 items-center gap-3 sm:ml-auto sm:max-w-[25.9375rem]"
            title={hasProgress ? undefined : t("progressPending")}>
            <div role="progressbar" aria-label={t("achievementProgress")}
              aria-valuemin={0} aria-valuemax={totalAchievements}
              aria-valuenow={hasProgress ? unlockedAchievements : undefined}
              aria-valuetext={hasProgress ? t("achievementProgressCount", { count: unlockedAchievements, total: totalAchievements }) : t("progressPending")}
              className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E3EDF7]">
              <div className="h-full rounded-full bg-[#1BD056] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${hasProgress ? unlockedAchievements / totalAchievements * 100 : 0}%` }} />
            </div>
            <span aria-hidden="true" className="shrink-0 whitespace-nowrap text-sm tabular-nums text-[#045E96]">
              {hasProgress ? unlockedAchievements : "—"}/{totalAchievements}
            </span>
          </div>
        )}
      </div>
      {rules ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 min-[100rem]:grid-cols-4">
          {GAME_ACHIEVEMENT_GROUPS.map((group) => {
            const rule = rules?.[group.key];
            const value = values?.[group.key];
            return (
              <ul key={group.key} className="space-y-6">
                {group.icons.map((icon, index) => {
                  const target = rule?.targets[index];
                  const unlocked = isAchievementUnlocked(value, target);
                  return (
                    <li key={icon} data-achievement={`${group.key}-${index}`} data-unlocked={unlocked} className="flex min-h-12 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <Image src={`/game-details/${icon}.png`} alt="" width={40} height={40} className={`max-h-[2.375rem] w-auto max-w-[2.375rem] object-contain ${unlocked ? "" : "grayscale opacity-50"}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold leading-5">{t(`achievementNames.${group.key}.${index}`)}</h3>
                        <span className="sr-only">{t(unlocked ? "achievementUnlocked" : "achievementLocked")}</span>
                        <p className="mt-1 text-[0.65rem] leading-4 text-[#66758D]">{rule && target !== undefined ? t(`achievementRules.${rule.descriptionKey}`, { count: target }) : t("achievementRulePending")}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })}
        </div>
      ) : <p className="mt-6 text-sm text-[#66758D]">{t("achievementsEmpty")}</p>}
    </section>
  );
}
