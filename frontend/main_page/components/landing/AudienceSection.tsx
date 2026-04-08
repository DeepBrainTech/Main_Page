import { useTranslations } from "next-intl";
import type { AudienceItem } from "@/types/landing";
import AudienceCard from "./AudienceCard";

interface AudienceSectionProps {
  items: AudienceItem[];
}

/**
 * 受众分组区块
 */
export default function AudienceSection({ items }: AudienceSectionProps) {
  const t = useTranslations("beforeloginV2.audience");

  return (
    <section className="relative px-4 py-14 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-8 h-52 w-[95%] -translate-x-1/2 rounded-[3rem] bg-[#dfe9f4]/80" />
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0B4F84]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.12em] text-[#0B4F84] sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
          {items.map((item) => (
            <AudienceCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
