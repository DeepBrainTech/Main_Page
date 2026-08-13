"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import PlaceholderMechanic from "@/components/features/training/mechanics/PlaceholderMechanic";
import LevelResultCard from "@/components/features/training/results/LevelResultCard";
import {
  loadTrainingProgress,
  recordLevelAttempt,
  saveTrainingProgress,
} from "@/lib/training/progress-local";
import type { TrainingLevelDefinition, TrainingStars, TrainingWorldDefinition } from "@/types/training";
import type { CognitiveDimensionKey } from "@/types/cognitive";

export default function LevelRunnerShell({
  world,
  level,
}: {
  world: TrainingWorldDefinition;
  level: TrainingLevelDefinition;
}) {
  const t = useTranslations("training");
  const tDim = useTranslations("dimensions");
  const [phase, setPhase] = useState<"play" | "result">("play");
  const [lastStars, setLastStars] = useState<TrainingStars>(0);

  const title = level.titleFallback;

  const handleComplete = (stars: TrainingStars) => {
    const next = recordLevelAttempt(loadTrainingProgress(), world.id, level, stars);
    saveTrainingProgress(next);
    setLastStars(stars);
    setPhase("result");
  };

  if (phase === "result") {
    return (
      <LevelResultCard
        stars={lastStars}
        dimensionLabels={level.dimensions.map((d: CognitiveDimensionKey) => tDim(d))}
        onRetry={() => setPhase("play")}
        worldHref={`/training/${world.id}`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[#106FAA]">
          {t("globalStage", { n: level.globalStage })} · {world.themeFallback}
        </p>
        <h1 className="mt-1 font-['Titan_One'] text-3xl text-[#045E96]">{title}</h1>
        {level.descriptionFallback ? (
          <p className="mt-2 text-sm text-[#106FAA]">{level.descriptionFallback}</p>
        ) : null}
      </div>
      <PlaceholderMechanic title={title} onComplete={handleComplete} />
    </div>
  );
}
