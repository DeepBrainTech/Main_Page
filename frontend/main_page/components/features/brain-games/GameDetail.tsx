"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n-navigation";
import { findGameDetail } from "@/lib/game-details";
import { useGameLauncher } from "@/hooks/useGameLauncher";
import { useGameLikes } from "@/hooks/useGameLikes";
import { useGameMedia } from "@/hooks/useGameMedia";
import { useGameAchievements } from "@/hooks/useGameAchievements";
import { dashboardCardClass } from "@/components/features/dashboard/dashboardCardStyles";
import GameAchievements from "./GameAchievements";
import GameMediaGallery from "./GameMediaGallery";
import GameLeaderboard from "./GameLeaderboard";

export default function GameDetail({ slug }: { slug: string }) {
  const t = useTranslations("gameDetails");
  const tHome = useTranslations("dashboard");
  const tBrain = useTranslations("brainGames");
  const { launchEntry } = useGameLauncher();
  const { likeStates, likeBusyKey, toggleGameLike } = useGameLikes();
  const { media, loading, error, retry } = useGameMedia(slug);
  const game = findGameDetail(slug)!;
  const { entry, dimension } = game;
  const achievementProgress = useGameAchievements(entry.key);
  const name = tHome(entry.nameKey);
  const likes = likeStates.get(entry.key);

  return (
    <div className="font-app-body mx-auto max-w-[110rem] pb-10 text-[#045E96]">
      <div className="grid min-w-0 items-start gap-7 xl:grid-cols-[minmax(0,2.18fr)_minmax(16rem,1fr)]">
        <div className="min-w-0 space-y-8">
          <article className={`${dashboardCardClass} min-w-0 p-6 sm:p-8 xl:p-12`}>
            <Link href="/braingames" className="inline-flex items-center gap-2 text-sm font-medium text-[#318EFF] hover:underline">
              <Image src="/game-details/ArrowLeft.svg" alt="" width={16} height={16} />{t("back")}
            </Link>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <h1 className="break-words font-['Titan_One'] text-3xl leading-tight sm:text-4xl xl:text-[2.75rem]">{name}</h1>
                <span className="mt-3 inline-flex rounded-full bg-[#EDF4FC] px-4 py-2 text-sm font-medium">{tBrain(`categoryChip.${dimension}`)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => launchEntry(entry)} className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#046699] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#045E96]">
                  <Image src="/game-details/PlayIconTriangle.svg" alt="" width={20} height={20} />{t("playNow")}
                </button>
                <button type="button" disabled={!likes || likeBusyKey !== null} aria-pressed={likes?.likedByMe ?? false}
                  aria-label={t(likes?.likedByMe ? "unlike" : "like")}
                  onClick={() => void toggleGameLike(entry.key, likes?.likedByMe ?? false)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm disabled:opacity-50 ${likes?.likedByMe ? "bg-[#DDEDFF]" : "hover:bg-[#EDF4FC]"}`}>
                  <Image src="/game-details/ThumbUp.svg" alt="" width={24} height={24} />({likes?.count ?? 0})
                </button>
              </div>
            </div>
            <div className="mt-7 text-base leading-relaxed">
              <p className="font-semibold">{entry.key === "chessmater" ? t("freefallIntro") : t("intro", { game: name, category: tBrain(`categoryChip.${dimension}`) })}</p>
              <p className="mt-2">{t(`descriptions.${entry.key}`)}</p>
            </div>
            {loading ? <p role="status" className="mt-8 animate-pulse rounded-2xl bg-[#EDF4FC] p-6">{t("loadingMedia")}</p> : error ? (
              <div role="status" className="mt-8 rounded-2xl bg-[#EDF4FC] p-6">
                <p>{t("mediaError")}</p><button type="button" onClick={retry} className="mt-3 rounded-full bg-white px-5 py-2 font-medium">{t("retry")}</button>
              </div>
            ) : <GameMediaGallery key={slug} previews={media.previews} tutorials={media.tutorials} gameName={name} />}
          </article>
          <GameAchievements gameKey={entry.key} progress={achievementProgress} />
        </div>
        {/* Keep the desktop sidebar from increasing the content row height. */}
        <div className="min-w-0 xl:relative xl:self-stretch">
          <GameLeaderboard gameKey={entry.key} />
        </div>
      </div>
    </div>
  );
}
