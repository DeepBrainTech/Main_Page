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
          <h2 className="text-balance text-sky-700 text-3xl font-normal font-['Titan_One'] leading-[1.15] tracking-[2px] min-[480px]:text-4xl min-[480px]:tracking-[4px] md:text-5xl md:tracking-[6px] min-[1100px]:text-6xl min-[1100px]:leading-[68px] min-[1100px]:tracking-[8px]">
            Play Smarter.
          </h2>
          <h3 className="text-balance text-sky-700 text-3xl font-normal font-['Titan_One'] leading-[1.15] tracking-[2px] min-[480px]:text-4xl min-[480px]:tracking-[4px] md:text-5xl md:tracking-[6px] min-[1100px]:text-6xl min-[1100px]:leading-[68px] min-[1100px]:tracking-[8px]">
            Think Deeper.
          </h3>
        </div>

        <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-8 min-[480px]:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={item.key}
              className={
                index % 2 === 0
                  ? "h-full min-[480px]:justify-self-end"
                  : "h-full min-[480px]:justify-self-start"
              }
            >
              <BenefitStoryCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
