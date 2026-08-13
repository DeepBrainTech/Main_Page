"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n-navigation";
import { findTrainingLevel } from "@/config/training/catalog";
import LevelRunnerShell from "@/components/features/training/shell/LevelRunnerShell";
import {
  isLevelUnlocked,
  loadTrainingProgress,
} from "@/lib/training/progress-local";

export default function TrainingLevelPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("training");
  const worldId = typeof params.worldId === "string" ? params.worldId : "";
  const levelId = typeof params.levelId === "string" ? params.levelId : "";
  const found = findTrainingLevel(worldId, levelId);

  useEffect(() => {
    if (!worldId || !levelId) return;
    if (!found) {
      router.replace("/training");
      return;
    }
    const progress = loadTrainingProgress();
    if (!isLevelUnlocked(progress, worldId, levelId)) {
      router.replace(`/training/${worldId}`);
    }
  }, [worldId, levelId, found, router]);

  if (!found) return null;

  const progress = loadTrainingProgress();
  if (!isLevelUnlocked(progress, worldId, levelId)) {
    return (
      <div className="space-y-3 pb-8">
        <p className="text-sm text-[#106FAA]">{t("locked")}</p>
        <Link href={`/training/${worldId}`} className="text-sm font-medium text-[#045E96]">
          ‹ {t("backToWorld")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 font-app-body">
      <Link
        href={`/training/${worldId}`}
        className="inline-flex text-sm font-medium text-[#106FAA] hover:text-[#045E96]"
      >
        ‹ {t("backToWorld")}
      </Link>
      <LevelRunnerShell world={found.world} level={found.level} />
    </div>
  );
}
