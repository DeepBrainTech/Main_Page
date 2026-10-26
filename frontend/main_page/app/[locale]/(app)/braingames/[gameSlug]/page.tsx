import { notFound } from "next/navigation";
import GameDetail from "@/components/features/brain-games/GameDetail";
import { findGameDetail } from "@/lib/game-details";

export const runtime = "edge";

export default async function GameDetailPage({ params }: { params: Promise<{ gameSlug: string }> }) {
  const { gameSlug } = await params;
  if (!findGameDetail(gameSlug)) notFound();
  return <GameDetail slug={gameSlug} />;
}
