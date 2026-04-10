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
  const imageScaleClassMap: Record<string, string> = {
    executiveFunction: "h-[80%] w-[80%]",
    problemSolving: "h-[150%] w-[150%]",
    imagination: "h-[150%] w-[132%]",
    mentalLongevity: "h-[118%] w-[118%]",
  };
  const imageSlotBgClass = imageSlotBgClassMap[item.key] ?? "";
  const imageScaleClass = imageScaleClassMap[item.key] ?? "h-[118%] w-[118%]";
  const allowImageOverflow = item.allowImageOverflow ?? true;

  return (
    <article className="relative mx-auto h-full w-full max-w-[25rem] pt-11">
      <div
        className={`absolute left-1/2 top-0 z-10 h-24 w-24 -translate-x-1/2 ${allowImageOverflow ? "" : "overflow-hidden rounded-full"}`}
      >
        <div className={`h-full w-full rounded-full shadow-md ${imageSlotBgClass}`} />
        <Image
          src={item.image}
          alt={t(`${item.key}.title`)}
          width={160}
          height={160}
          className={
            allowImageOverflow
              ? `pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain ${imageScaleClass}`
              : "pointer-events-none absolute inset-0 h-full w-full object-cover"
          }
        />
      </div>
      <div className={`flex h-auto min-h-[24rem] flex-col rounded-3xl px-5 pb-6 pt-14 shadow-md min-[480px]:min-h-[26rem] md:h-[28rem] ${item.cardClass}`}>
        <h3 className="shrink-0 text-center text-base font-normal font-['Titan_One'] text-[#0B4F84] sm:text-lg">
          {t(`${item.key}.title`)}
        </h3>
        <p className="mt-3 flex-1 pr-1 text-center text-xs font-normal font-['Outfit'] leading-6 text-[#1571AA] sm:text-sm">
          {t(`${item.key}.description`)}
        </p>
      </div>
    </article>
  );
}
