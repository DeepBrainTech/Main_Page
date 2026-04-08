import Image from "next/image";
import { useTranslations } from "next-intl";
import type { GameCategoryItem } from "@/types/landing";

interface GameCategoryCardProps {
  item: GameCategoryItem;
  onClick: () => void;
}

/**
 * 游戏分类卡片
 */
export default function GameCategoryCard({
  item,
  onClick,
}: GameCategoryCardProps) {
  const t = useTranslations("beforeloginV2.gameCategories.items");

  return (
    <article className="mx-auto w-full max-w-[648px]">
      <div className="w-full overflow-hidden rounded-[45px] border-0 shadow-none">
        <div className="relative aspect-[648/370] w-full">
          <div className="absolute inset-[4%]">
            <Image
              src={item.image}
              alt={t(`${item.key}.title`)}
              fill
              sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 648px"
              className="object-contain object-center"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onClick}
        className="mt-3 w-full rounded-xl border border-[#c94f38] bg-[#E76F51] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#d45d3f]"
      >
        {t(`${item.key}.title`)}
      </button>
    </article>
  );
}
