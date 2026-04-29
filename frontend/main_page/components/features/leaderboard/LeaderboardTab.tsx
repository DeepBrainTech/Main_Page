"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/userApi";

type LeaderboardTabType = "global" | "dimension";

const DIMENSIONS_MAP = [
  { key: "memory", label: "Memory" },
  { key: "spatial", label: "Spatial" },
  { key: "strategy", label: "Strategy" },
  { key: "logic", label: "Logic" },
  { key: "focus", label: "Focus" },
  { key: "reaction", label: "Speed" },
];

export default function LeaderboardTab() {
  const t = useTranslations("leaderboard");
  const tDim = useTranslations("dimensions");
  const [totalList, setTotalList] = useState<LeaderboardEntry[]>([]);
  const [byDimension, setByDimension] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardTabType>("global");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [total, ...dimLists] = await Promise.all([
          fetchLeaderboard("total"),
          ...COGNITIVE_DIMENSION_KEYS.map((key) => fetchLeaderboard(key)),
        ]);
        if (!cancelled) {
          setTotalList(total);
          const dimMap: Record<string, LeaderboardEntry[]> = {};
          COGNITIVE_DIMENSION_KEYS.forEach((key, i) => {
            dimMap[key] = dimLists[i] ?? [];
          });
          setByDimension(dimMap);
        }
      } catch {
        if (!cancelled) setTotalList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          <p className="text-sm text-slate-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const top3 = totalList.slice(0, 3);
  const rest = totalList.slice(3);

  const getRankGradient = (rank: number) => {
    if (rank === 1)
      return "linear-gradient(135deg, rgb(255, 215, 0) 0%, rgb(255, 204, 0) 23%, rgb(255, 184, 0) 61%, rgb(255, 165, 0) 100%)";
    if (rank === 2)
      return "linear-gradient(135deg, rgb(192, 192, 192) 0%, rgb(186, 186, 186) 25%, rgb(177, 177, 177) 62%, rgb(168, 168, 168) 100%)";
    if (rank === 3)
      return "linear-gradient(135deg, rgb(205, 127, 50) 0%, rgb(195, 116, 49) 23%, rgb(177, 99, 47) 61%, rgb(160, 82, 45) 100%)";
    return "linear-gradient(135deg, #EDF4FC 0%, #EDF4FC 100%)";
  };

  const getRankTextColor = (rank: number) => {
    return rank <= 3 ? "text-white" : "text-[#106FAA]";
  };

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    if (trend === "up") return { symbol: "▲", color: "text-green-500" };
    if (trend === "down") return { symbol: "▼", color: "text-red-500" };
    return { symbol: "—", color: "text-gray-400" }; // 持平
  };

  return (
    <div className="space-y-10 pb-10 font-['Outfit']">
      {/* Header Tabs */}
      <div className="flex justify-center relative z-10">
        <div className="flex rounded-[20px] bg-white/80 p-[2px] shadow-sm backdrop-blur-md border border-white/60">
          <button
            onClick={() => setActiveTab("global")}
            className={`rounded-[16px] px-8 py-2 text-lg font-semibold transition-all ${
              activeTab === "global"
                ? "bg-[#E45C44] text-white shadow-md"
                : "text-[#106FAA] hover:bg-white/50"
            }`}
          >
            Global Brainpower Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("dimension")}
            className={`rounded-[16px] px-8 py-2 text-lg font-semibold transition-all ${
              activeTab === "dimension"
                ? "bg-[#E45C44] text-white shadow-md"
                : "text-[#106FAA] hover:bg-white/50"
            }`}
          >
            Leaderboards by Dimension
          </button>
        </div>
      </div>

      {activeTab === "global" && (
        <div className="space-y-8 w-full">
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-[70px]">
            {top3.map((user) => (
              <div
                key={user.user_id}
                className="relative rounded-[32px] bg-white/80 border border-white/60 p-6 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md flex flex-col items-center"
              >
                {/* Avatar */}
                <div className="absolute -top-[65px] flex h-[130px] w-[130px] items-center justify-center overflow-hidden rounded-full border-8 border-white/80 bg-white shadow-lg">
                  <img
                    src={user.avatar_url || "/dashboard/default.png"}
                    alt={user.username}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/dashboard/default.png";
                    }}
                  />
                </div>

                {/* Name */}
                <h3 className="mt-14 text-2xl font-semibold text-gray-800">{user.username}</h3>

                {/* Main Stats */}
                <div className="mt-6 flex w-full justify-between px-2 text-center">
                  <div className="flex-1">
                    <p className="text-base font-medium text-[#106FAA]">Rank</p>
                    <div className="mt-2 mx-auto flex items-center justify-center gap-2">
                      <div
                        className={`flex h-[36px] w-[36px] items-center justify-center rounded-full shadow-sm text-lg font-bold ${getRankTextColor(
                          user.rank
                        )}`}
                        style={{ background: getRankGradient(user.rank) }}
                      >
                        {user.rank}
                      </div>
                      <span className={`text-sm font-bold ${getTrendIcon(user.trend).color}`}>
                        {getTrendIcon(user.trend).symbol}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-[#106FAA]">Brainpower</p>
                    <p className="mt-2 text-[32px] font-semibold leading-9 text-[#0075FF]">{user.score}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-[#106FAA]">Country</p>
                    <p className="mt-2 text-[32px] leading-9">🇺🇸</p>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="mt-6 grid w-full grid-cols-2 gap-x-4 gap-y-3">
                  {DIMENSIONS_MAP.map((dim) => (
                    <div
                      key={dim.key}
                      className="flex items-center justify-between rounded-[12.8px] bg-[#EDF4FC] px-4 py-2"
                    >
                      <span className="text-[13px] font-semibold text-[#045E96]">{dim.label}</span>
                      <span className="text-[14px] font-medium text-[#E45C44]">
                        {(user[dim.key as keyof LeaderboardEntry] as number | null | undefined) ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Rank 4+ Table */}
          <div className="rounded-[32px] bg-white/60 border border-white/60 p-8 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)] backdrop-blur-md">
            <div className="grid grid-cols-4 gap-4 rounded-xl bg-[#EDF4FC] px-6 py-4 text-base font-medium text-gray-800 mb-3">
              <div>Ranking</div>
              <div>Name</div>
              <div>Country</div>
              <div>Brainpower</div>
            </div>

            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-2 custom-scrollbar">
              {rest.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t("noData")}</div>
              ) : (
                rest.map((user) => (
                  <div
                    key={user.user_id}
                    className="grid grid-cols-4 items-center gap-4 rounded-xl bg-[#F5F9FC] px-6 py-4 transition-colors hover:bg-white/80"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF4FC] text-sm font-bold text-[#106FAA]">
                        {user.rank}
                      </div>
                    <div className="flex flex-col text-[12px] font-bold">
                      <span className={getTrendIcon(user.trend).color}>
                        {getTrendIcon(user.trend).symbol}
                      </span>
                    </div>
                    </div>
                    <div className="text-base font-medium text-gray-800">{user.username}</div>
                    <div className="text-2xl">🇺🇸</div>
                    <div className="text-[20px] font-bold text-[#0075FF]">{user.score}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "dimension" && (
        <section className="w-full space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COGNITIVE_DIMENSION_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-md backdrop-blur-sm"
              >
                <h4 className="mb-6 text-xl font-bold text-[#106FAA]">{tDim(key)} Leaderboard</h4>
                {!byDimension[key] || byDimension[key].length === 0 ? (
                  <p className="text-sm text-gray-500">{t("noData")}</p>
                ) : (
                  <ul className="space-y-4 text-sm">
                    {byDimension[key].slice(0, 5).map((row) => {
                      const isTop3 = row.rank <= 3;
                      return (
                        <li
                          key={`${key}-${row.user_id}`}
                          className={`flex items-center justify-between rounded-[16px] p-3 transition-colors ${
                            isTop3 ? "bg-[#FFF9E5]" : "bg-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                                isTop3 ? "text-white" : "bg-[#EDF4FC] text-[#106FAA]"
                              }`}
                              style={{ background: isTop3 ? getRankGradient(row.rank) : undefined }}
                            >
                              {row.rank}
                            </span>
                            <span className="text-base font-medium text-gray-800">{row.username}</span>
                          </div>
                          <span className="text-lg font-bold text-[#0075FF]">{row.score}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #e8e8e8;
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #7a7a7a;
          border-radius: 100px;
        }
        `
      }} />
    </div>
  );
}
