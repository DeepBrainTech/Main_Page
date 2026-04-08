import type { AudienceItem } from "@/types/landing";
import AudienceCard from "./AudienceCard";

interface AudienceSectionProps {
  items: AudienceItem[];
}

/**
 * 受众分组区块
 */
export default function AudienceSection({ items }: AudienceSectionProps) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-14 text-center sm:mb-16">
          <h2 className="text-sky-700 text-6xl font-normal font-['Titan_One'] leading-[49.79px] tracking-[8px]">
            WHO IS THIS FOR
          </h2>
        </div>

        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 min-[480px]:grid min-[480px]:auto-rows-fr min-[480px]:grid-cols-2 min-[480px]:items-stretch min-[480px]:gap-8 min-[480px]:overflow-visible min-[480px]:pb-0 sm:gap-10">
          {items.map((item) => (
            <div key={item.key} className="min-w-[18.5rem] snap-start min-[480px]:min-w-0">
              <AudienceCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
