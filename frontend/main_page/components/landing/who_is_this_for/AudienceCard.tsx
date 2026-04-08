import Image from "next/image";
import { useTranslations } from "next-intl";
import type { AudienceItem } from "@/types/landing";

interface AudienceCardProps {
  item: AudienceItem;
}

const audienceImageStyleMap: Record<
  string,
  { wrapperClassName: string; contentPaddingClassName: string }
> = {
  students: {
    wrapperClassName:
      "pointer-events-none absolute -top-20 -left-0 z-10 overflow-visible h-[16.5rem] w-[16.5rem]",
    contentPaddingClassName: "pl-[11.5rem]",
  },
  children: {
    wrapperClassName:
      "pointer-events-none absolute -top-20 -left-1 z-10 overflow-visible h-[16.5rem] w-[16.5rem]",
    contentPaddingClassName: "pl-[14.5rem]",
  },
  educators: {
    wrapperClassName:
      "pointer-events-none absolute -top-20 -left-1 z-10 overflow-visible h-[16.5rem] w-[16.5rem]",
    contentPaddingClassName: "pl-[10.5rem]",
  },
  olderAdults: {
    wrapperClassName:
      "pointer-events-none absolute -top-20 -left-1 z-10 overflow-visible h-[16.5rem] w-[16.5rem]",
    contentPaddingClassName: "pl-[13.0rem]",
  },
};

/**
 * 受众卡片
 */
export default function AudienceCard({ item }: AudienceCardProps) {
  const t = useTranslations("beforeloginV2.audience.items");
  const imageStyle =
    audienceImageStyleMap[item.key] ?? {
      wrapperClassName:
        "pointer-events-none absolute -top-10 -left-2 z-10 overflow-visible h-[16.5rem] w-[16.5rem]",
      contentPaddingClassName: "pl-[11.5rem]",
    };

  return (
    <article className="relative flex h-full w-full flex-col rounded-3xl bg-[#D4EAF8] px-4 pb-4 pt-6 sm:px-6 sm:pb-5 sm:pt-7">
      <div className="relative h-[11.5rem] rounded-2xl">
        <div className={imageStyle.wrapperClassName}>
          <Image
            src={item.image}
            alt={t(`${item.key}.title`)}
            width={381}
            height={381}
            className="h-full w-full object-contain"
          />
        </div>

        <div className={`${imageStyle.contentPaddingClassName} pr-2 pt-3`}>
          <p
            className="text-right text-xl font-medium leading-relaxed text-[#538DB1] sm:text-2xl sm:leading-relaxed"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {t(`${item.key}.description`)}
          </p>
        </div>
      </div>

      <div className="mt-0 flex w-full shrink-0 items-center justify-center rounded-2xl bg-indigo-50 px-4 py-3 sm:px-6 sm:py-4">
        <p
          className="text-center text-xl font-medium leading-relaxed text-[#045E96] sm:text-2xl sm:leading-relaxed"
          style={{ fontFamily: "var(--font-outfit), sans-serif" }}
        >
          {t(`${item.key}.title`)}
        </p>
      </div>
    </article>
  );
}
