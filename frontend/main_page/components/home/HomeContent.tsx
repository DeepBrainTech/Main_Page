"use client";

import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

interface RewardStatus {
  game_mode: string;
  flowers_earned: number;
  click_count: number;
  last_played_at: string | null;
  last_claimed_at: string | null;
  can_claim_now: boolean;
  seconds_until_next_claim: number;
}

interface HomeContentProps {
  username: string;
  onFogChess: () => void;
  onSudokuBattle: () => void;
  onSudoku: () => void;
  onQuantumGo: () => void;
  onChessMater: () => void;
  onChessTourmaster: () => void;
  onLogout: () => void;
  totalFlowers: number;
  rewardByMode: Record<string, RewardStatus>;
}

function FlowerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" fill="#F59E0B" />
      <ellipse cx="12" cy="5" rx="2.6" ry="3.2" fill="#F472B6" />
      <ellipse cx="12" cy="19" rx="2.6" ry="3.2" fill="#F472B6" />
      <ellipse cx="5" cy="12" rx="3.2" ry="2.6" fill="#F472B6" />
      <ellipse cx="19" cy="12" rx="3.2" ry="2.6" fill="#F472B6" />
      <ellipse cx="7.2" cy="7.2" rx="2.1" ry="2.8" transform="rotate(-45 7.2 7.2)" fill="#FB7185" />
      <ellipse cx="16.8" cy="16.8" rx="2.1" ry="2.8" transform="rotate(-45 16.8 16.8)" fill="#FB7185" />
      <ellipse cx="16.8" cy="7.2" rx="2.1" ry="2.8" transform="rotate(45 16.8 7.2)" fill="#FB7185" />
      <ellipse cx="7.2" cy="16.8" rx="2.1" ry="2.8" transform="rotate(45 7.2 16.8)" fill="#FB7185" />
    </svg>
  );
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * 主页内容组件
 * 负责渲染主页的 UI
 */
export default function HomeContent({
  username,
  onFogChess,
  onSudokuBattle,
  onSudoku,
  onQuantumGo,
  onChessMater,
  onChessTourmaster,
  onLogout,
  totalFlowers,
  rewardByMode,
}: HomeContentProps) {
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");
  const [secondsByMode, setSecondsByMode] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    for (const [mode, status] of Object.entries(rewardByMode)) {
      initial[mode] = status.seconds_until_next_claim;
    }
    setSecondsByMode(initial);
  }, [rewardByMode]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setSecondsByMode((prev) => {
        const next: Record<string, number> = {};
        for (const [mode, sec] of Object.entries(prev)) {
          next[mode] = Math.max(0, sec - 1);
        }
        return next;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  // 游戏配置，包含颜色和图标
  const games = [
    {
      key: "fogChess",
      modeKey: "fogchess",
      name: tHome("startFogChess"),
      onClick: onFogChess,
      color: "bg-[#D08770]",
      hoverColor: "hover:bg-[#C07760]",
    },
    {
      key: "sudoku",
      modeKey: "sudoku",
      name: tHome("sudoku"),
      onClick: onSudoku,
      color: "bg-[#EEC643]",
      hoverColor: "hover:bg-[#DEB633]",
    },
    // {
    //   key: "sudokuBattle",
    //   name: tHome("sudokuBattle"),
    //   onClick: onSudokuBattle,
    //   color: "bg-[#EEC643]",
    //   hoverColor: "hover:bg-[#DEB633]",
    // },
    {
      key: "quantumGo",
      modeKey: "quantumgo",
      name: tHome("quantumGo"),
      onClick: onQuantumGo,
      color: "bg-[#5E81AC]",
      hoverColor: "hover:bg-[#4E719C]",
    },
    {
      key: "chessMater",
      modeKey: "chessmater",
      name: tHome("chessMater"),
      onClick: onChessMater,
      color: "bg-[#5E81AC]",
      hoverColor: "hover:bg-[#4E719C]",
    },
    {
      key: "chessTourmaster",
      modeKey: "chess-tourmaster",
      name: tHome("chessTourmaster"),
      onClick: onChessTourmaster,
      color: "bg-[#A3BE8C]",
      hoverColor: "hover:bg-[#93AE7C]",
    },
    {
      key: "intercontinentalChess",
      modeKey: "intercontinental-chess",
      name: tHome("intercontinentalChess"),
      externalUrl: "https://intercontinental-chess.deepbraintechnology.com/",
      color: "bg-[#B48EAD]",
      hoverColor: "hover:bg-[#A47E9D]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FEF6EC] font-sans">
      {/* Header - 与首页保持一致 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">🧠 DeepBrainTech Presents</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 欢迎区域 */}
          <div className="text-center mb-12">
            <h2 
              className="text-4xl md:text-5xl font-bold text-[#2C3539] mb-4"
              style={{ textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)' }}
            >
              {tHome("welcomeUser", { username })}
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              {tHome("subtitle")}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md">
              <FlowerIcon />
              <span className="font-semibold text-[#2C3539]">{tHome("flowersCount", { count: totalFlowers })}</span>
            </div>
          </div>

          {/* 游戏按钮网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {games.map((game) => (
              <button
                key={game.key}
                onClick={"externalUrl" in game && game.externalUrl ? () => window.open(game.externalUrl, "_blank") : game.onClick}
                className={`${game.color} ${game.hoverColor} text-white rounded-2xl px-6 py-8 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center min-h-[120px]`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span>{game.name}</span>
                  {"modeKey" in game && game.modeKey != null &&
                    (rewardByMode[game.modeKey]?.can_claim_now || rewardByMode[game.modeKey] === undefined ? (
                      <span className="text-xs rounded-full bg-white/20 px-2 py-1">{tHome("dailyRewardReady")}</span>
                    ) : (
                      <span className="text-xs rounded-full bg-black/20 px-2 py-1">
                        {tHome("nextRewardIn", {
                          time: formatSeconds(
                            secondsByMode[game.modeKey] ?? rewardByMode[game.modeKey].seconds_until_next_claim
                          ),
                        })}
                      </span>
                    ))}
                </div>
              </button>
            ))}
          </div>

          {/* 退出登录按钮 */}
          <div className="flex justify-center mt-8">
            <button
              onClick={onLogout}
              className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-full font-medium transition-all duration-300 hover:bg-gray-50 hover:border-gray-400 shadow-md hover:shadow-lg"
            >
              {tCommon("logout")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

