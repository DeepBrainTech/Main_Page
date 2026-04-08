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
    <article>
      <div className="overflow-hidden rounded-2xl border-[3px] border-[#b6d5e9] bg-white shadow-md">
        <div className="relative">
          <Image
            src={item.image}
            alt={t(`${item.key}.title`)}
            width={640}
            height={360}
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-slate-900/10 to-transparent" />
          <h3 className="absolute bottom-3 left-3 text-2xl font-black uppercase tracking-wide text-white [text-shadow:_0_2px_4px_rgb(0_0_0_/_0.6)]">
            {t(`${item.key}.title`)}
          </h3>
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
