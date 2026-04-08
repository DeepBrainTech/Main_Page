import Image from "next/image";
import { useTranslations } from "next-intl";
import type { BenefitStoryItem } from "@/types/landing";

interface BenefitStoryCardProps {
  item: BenefitStoryItem;
}

/**
 * 价值说明卡片
 */
export default function BenefitStoryCard({ item }: BenefitStoryCardProps) {
  const t = useTranslations("beforeloginV2.benefitStories.items");

  return (
    <article className="relative pt-9">
      <div className="absolute left-1/2 top-0 z-10 h-20 w-20 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white shadow-md">
        <Image
          src={item.image}
          alt={t(`${item.key}.title`)}
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      </div>
      <div className={`rounded-3xl px-5 pb-6 pt-12 shadow-md ${item.cardClass}`}>
        <h3 className="text-center text-base font-black text-[#0B4F84] sm:text-lg">
          {t(`${item.key}.title`)}
        </h3>
        <p className="mt-3 text-center text-xs leading-6 text-[#28547a] sm:text-sm">
          {t(`${item.key}.description`)}
        </p>
      </div>
    </article>
  );
}
