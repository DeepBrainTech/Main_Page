"use client";

import BrainGamesTab from "@/components/features/brain-games/BrainGamesTab";
import { useGameLauncher } from "@/hooks/useGameLauncher";

export default function BrainGamesPage() {
  const {
    handleFogChess,
    handleSudoku,
    handleQuantumGo,
    handleChessMater,
    handleChessTourmaster,
    handleOnlineChess,
    handleNumberBlast,
  } = useGameLauncher();

  return (
    <BrainGamesTab
      onLaunch={{
        chessMater: handleChessMater,
        chessTourmaster: handleChessTourmaster,
        sudoku: handleSudoku,
        quantumGo: handleQuantumGo,
        fogChess: handleFogChess,
        onlineChess: handleOnlineChess,
        numberBlast: handleNumberBlast,
      }}
    />
  );
}
