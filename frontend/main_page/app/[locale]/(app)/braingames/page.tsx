"use client";

import BrainGamesTab from "@/components/features/brain-games/BrainGamesTab";
import { useGameLauncher } from "@/hooks/useGameLauncher";

export default function BrainGamesPage() {
  const { launchEntry } = useGameLauncher();

  return <BrainGamesTab onLaunchGame={launchEntry} />;
}
