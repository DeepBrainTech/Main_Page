import Image from "next/image";
import { useTranslations } from "next-intl";
import type { AudienceItem } from "@/types/landing";

interface AudienceCardProps {
  item: AudienceItem;
}

/**
 * 受众卡片
 */
export default function AudienceCard({ item }: AudienceCardProps) {
  const t = useTranslations("beforeloginV2.audience.items");

  return (
    <article className="rounded-3xl border-4 border-[#c6dced] bg-[#dff0ff] p-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white sm:h-28 sm:w-28">
          <Image
            src={item.image}
            alt={t(`${item.key}.title`)}
            width={240}
            height={240}
            className="h-full w-full object-cover"
          />
        </div>
        <p className="text-xs leading-6 text-[#28547a] sm:text-sm">
          {t(`${item.key}.description`)}
        </p>
      </div>

      <div className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-center text-sm font-bold text-[#0B4F84]">
        {t(`${item.key}.title`)}
      </div>
    </article>
  );
}
