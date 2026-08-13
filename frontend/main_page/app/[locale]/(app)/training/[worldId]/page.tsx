"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n-navigation";
import { findTrainingWorld } from "@/config/training/catalog";
import WorldPathMap from "@/components/features/training/map/WorldPathMap";

export default function TrainingWorldPage() {
  const params = useParams();
  const router = useRouter();
  const worldId = typeof params.worldId === "string" ? params.worldId : "";
  const world = findTrainingWorld(worldId);

  useEffect(() => {
    if (worldId && !world) router.replace("/training");
  }, [worldId, world, router]);

  if (!world) return null;
  return <WorldPathMap world={world} />;
}
