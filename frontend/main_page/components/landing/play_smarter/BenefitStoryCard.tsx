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
  const imageSlotBgClassMap: Record<string, string> = {
    executiveFunction: "bg-[#E9B4B4]",
    problemSolving: "bg-[#95C8B3]",
    imagination: "bg-[#83B9DB]",
    mentalLongevity: "bg-[#D7BDE4]",
  };
  const imageSlotBgClass = imageSlotBgClassMap[item.key] ?? "";

  return (
    <article className="relative mx-auto h-full w-full max-w-[25rem] pt-9">
      <div
        className={`absolute left-1/2 top-0 z-10 h-20 w-20 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white shadow-md ${imageSlotBgClass}`}
      >
        <Image
          src={item.image}
          alt={t(`${item.key}.title`)}
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      </div>
      <div className={`flex h-[28rem] flex-col rounded-3xl px-5 pb-6 pt-12 shadow-md ${item.cardClass}`}>
        <h3 className="shrink-0 text-center text-base font-normal font-['Titan_One'] text-[#0B4F84] sm:text-lg">
          {t(`${item.key}.title`)}
        </h3>
        <p className="mt-3 flex-1 overflow-y-auto pr-1 text-center text-xs font-normal font-['Outfit'] leading-6 text-[#1571AA] sm:text-sm">
          {t(`${item.key}.description`)}
        </p>
      </div>
    </article>
  );
}
