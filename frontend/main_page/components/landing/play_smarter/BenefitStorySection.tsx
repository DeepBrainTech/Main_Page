import { useTranslations } from "next-intl";
import type { BenefitStoryItem } from "@/types/landing";
import BenefitStoryCard from "./BenefitStoryCard";

interface BenefitStorySectionProps {
  items: BenefitStoryItem[];
}

/**
 * 价值说明区块
 */
export default function BenefitStorySection({ items }: BenefitStorySectionProps) {
  const t = useTranslations("beforeloginV2.finalCta");

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-sky-700 text-6xl font-normal font-['Titan_One'] leading-[68px] tracking-[8px]">
            Play Smarter.
          </h2>
          <h3 className="text-sky-700 text-6xl font-normal font-['Titan_One'] leading-[68px] tracking-[8px]">
            Think Deeper.
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-8 min-[480px]:grid-cols-2">
          {items.map((item) => (
            <BenefitStoryCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
