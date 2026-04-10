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
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-center text-sky-700 text-3xl font-normal font-['Titan_One'] leading-[1.15] tracking-[2px] min-[480px]:text-4xl min-[480px]:tracking-[4px] md:text-5xl md:tracking-[6px] min-[1100px]:text-6xl min-[1100px]:leading-[49.79px] min-[1100px]:tracking-[8px]">
            {t("eyebrow")}
          </h2>
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
