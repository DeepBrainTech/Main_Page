import { useTranslations } from "next-intl";
import type { GameCategoryItem } from "@/types/landing";
import GameCategoryCard from "./GameCategoryCard";

interface GameCategorySectionProps {
  items: GameCategoryItem[];
  onPlayClick: () => void;
}

/**
 * 游戏分类区块
 */
export default function GameCategorySection({
  items,
  onPlayClick,
}: GameCategorySectionProps) {
  const t = useTranslations("beforeloginV2.gameCategories");

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black uppercase tracking-[0.12em] text-[#0B4F84] sm:text-4xl">
            {t("eyebrow")}
          </h2>
          <p className="mt-2 text-xs font-semibold text-[#0B4F84] sm:text-sm">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-8 min-[480px]:grid-cols-2">
          {items.map((item) => (
            <GameCategoryCard key={item.key} item={item} onClick={onPlayClick} />
          ))}
        </div>
      </div>
    </section>
  );
}
