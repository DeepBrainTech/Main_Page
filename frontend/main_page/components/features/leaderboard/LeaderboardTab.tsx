"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COGNITIVE_DIMENSION_KEYS } from "@/types/cognitive";
import { fetchLeaderboard, type LeaderboardEntry } from "@/services/userApi";

/**
 * 排行榜 Tab：总脑力榜 + 各维度榜（从后端获取）
 */
export default function LeaderboardTab() {
  const t = useTranslations("leaderboard");
  const tDim = useTranslations("dimensions");
  const [totalList, setTotalList] = useState<LeaderboardEntry[]>([]);
  const [byDimension, setByDimension] = useState<Record<string, LeaderboardEntry[]>>({});
  const [loading, setLoading] = useState(true);

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
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
      <section>
        <h3 className="mb-3 font-semibold text-gray-700">{t("total")}</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-600">{t("rank")}</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">{t("user")}</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">{t("score")}</th>
              </tr>
            </thead>
            <tbody>
              {totalList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-500">{t("noData")}</td>
                </tr>
              ) : (
                totalList.map((row) => (
                  <tr key={`total-${row.rank}-${row.user_id}`} className="border-t border-gray-100">
                    <td className="px-4 py-2">{row.rank}</td>
                    <td className="px-4 py-2">{row.username}</td>
                    <td className="px-4 py-2 text-right">{row.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-3 font-semibold text-gray-700">{t("byDimension")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COGNITIVE_DIMENSION_KEYS.map((key) => (
            <div key={key} className="rounded-lg border border-gray-200 bg-white p-3">
              <h4 className="mb-2 text-sm font-medium text-gray-700">{tDim(key)}</h4>
              {(!byDimension[key] || byDimension[key].length === 0) ? (
                <p className="text-xs text-gray-500">{t("noData")}</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {byDimension[key].slice(0, 5).map((row) => (
                    <li key={`${key}-${row.user_id}`} className="flex justify-between">
                      <span>{row.rank}. {row.username}</span>
                      <span>{row.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
