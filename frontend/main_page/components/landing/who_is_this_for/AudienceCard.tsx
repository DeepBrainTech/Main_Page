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
    <article className="relative h-full w-full">
      <div className="relative flex h-[10.5rem] w-full overflow-hidden rounded-[18px] bg-blue-100 px-3 pb-3 pt-3 min-[360px]:h-[11.25rem] sm:h-56 sm:rounded-[24px] sm:px-4 sm:pb-4 sm:pt-4 md:h-[17rem] min-[1100px]:hidden">
        <div className="pointer-events-none absolute bottom-2 left-1 z-30 h-28 w-28 overflow-visible min-[360px]:h-30 min-[360px]:w-30 sm:bottom-3 sm:h-40 sm:w-40 md:bottom-2 md:h-44 md:w-44 lg:h-48 lg:w-48">
          <Image
            src={item.image}
            alt={t(`${item.key}.title`)}
            width={381}
            height={381}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="absolute right-3 top-4 bottom-[3.75rem] w-[58%] overflow-hidden min-[360px]:bottom-[4.1rem] min-[360px]:w-[56%] sm:right-4 sm:top-5 sm:bottom-[4.75rem] sm:w-[55%] md:top-6 md:bottom-[5.75rem] md:w-[50%]">
          <p
            className="break-words text-right text-[clamp(0.78rem,2.4vw,1.05rem)] font-medium leading-5 text-[#538DB1] sm:leading-6 md:leading-6"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {t(`${item.key}.description`)}
          </p>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-20 flex min-h-11 items-center justify-end rounded-xl bg-indigo-50 px-3 py-1.5 sm:left-4 sm:right-4 sm:min-h-12 sm:py-2 md:min-h-[4.25rem]">
          <p
            className="ml-auto max-h-[3.8rem] w-[70%] overflow-hidden break-words text-right text-[clamp(0.88rem,2.5vw,1.15rem)] font-medium leading-5 text-[#045E96] min-[360px]:w-[68%] sm:max-h-[4rem] sm:w-[64%] sm:leading-6 md:w-[62%] md:leading-7"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {t(`${item.key}.title`)}
          </p>
        </div>
      </div>

      <div className="hidden h-full min-[1100px]:block">
        <div className="relative flex h-full w-full flex-col rounded-3xl bg-[#D4EAF8] px-4 pb-4 pt-6 sm:px-6 sm:pb-5 sm:pt-7">
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
        </div>
      </div>
    </article>
  );
}
