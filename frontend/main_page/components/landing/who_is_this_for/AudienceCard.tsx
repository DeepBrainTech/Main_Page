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
      <div className="relative flex h-45 w-full overflow-hidden rounded-[18px] bg-blue-100 px-3 pb-3 pt-3 sm:h-56 sm:rounded-[24px] sm:px-4 sm:pb-4 sm:pt-4 md:h-[16rem] min-[1100px]:hidden">
        <div className="pointer-events-none absolute bottom-2 left-1 z-30 h-32 w-32 overflow-visible sm:bottom-3 sm:h-40 sm:w-40 md:bottom-3 md:h-52 md:w-52">
          <Image
            src={item.image}
            alt={t(`${item.key}.title`)}
            width={381}
            height={381}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="absolute right-3 top-4 bottom-14 w-[56%] overflow-hidden sm:right-4 sm:top-5 sm:bottom-16 sm:w-[55%] md:top-6 md:bottom-20 md:w-[50%]">
          <p
            className="break-words text-right text-[0.92rem] font-medium leading-5 text-[#538DB1] sm:text-[1rem] sm:leading-6 md:text-[1.12rem] md:leading-8"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {t(`${item.key}.description`)}
          </p>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-20 flex h-11 items-center justify-end rounded-xl bg-indigo-50 px-3 sm:left-4 sm:right-4 sm:h-12 md:h-[3.75rem]">
          <p
            className="ml-auto w-[68%] break-words text-right text-[0.98rem] font-medium leading-5 text-[#045E96] sm:w-[64%] sm:text-[1.08rem] sm:leading-6 md:w-[62%] md:text-[1.28rem] md:leading-8"
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
