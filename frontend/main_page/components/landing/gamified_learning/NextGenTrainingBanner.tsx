import Image from "next/image";
import { useTranslations } from "next-intl";
import CheckerBackground from "../shared/CheckerBackground";

/** Feature banner for teen and young-adult focused brain training. */
export default function NextGenTrainingBanner() {
  const t = useTranslations("figmaHome");

  return (
    <section className="relative isolate overflow-hidden bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32 2xl:h-[69.2rem] 2xl:min-h-[69.2rem] 2xl:px-0 2xl:py-0">
      <CheckerBackground layout="frame1688" />
      <div className="relative mx-auto h-full w-full max-w-[120rem] 2xl:max-w-none">
        <div className="relative -mx-5 aspect-[1920/1996] w-[clamp(18rem,45vw,55rem)] max-w-full sm:-mx-8 lg:-mx-12 2xl:absolute 2xl:left-0 2xl:top-[5.5%] 2xl:mx-0 2xl:aspect-[1920/1996] 2xl:h-auto 2xl:w-1/2 2xl:max-w-none">
          <Image
          src="/landing/next_gen/group-1695.png"
            alt=""
            fill
            sizes="(min-width: 1536px) 50vw, (min-width: 640px) 45vw, 100vw"
            className="object-contain object-top"
            aria-hidden="true"
          />
        </div>

        <div className="mx-auto max-w-[50rem] text-center 2xl:absolute 2xl:left-[54.1667%] 2xl:top-[27.1906%] 2xl:mx-0 2xl:w-[41.6667%] 2xl:max-w-none">
          <div className="font-app-body inline-flex items-center gap-3 text-lg text-black sm:text-2xl">
            <Image src="/landing/next_gen/next-gen-binoculars.svg" alt="" width={40} height={40} className="size-8 object-contain sm:size-10" aria-hidden="true" />
            <span>{t("nextGenEyebrow")}</span>
          </div>
          <h2 className="font-figma-heading mt-7 whitespace-pre-line text-4xl font-bold leading-tight text-black sm:mt-10 sm:text-5xl 2xl:mt-10 2xl:w-full 2xl:text-[3rem] 2xl:leading-[3.75rem]">
            {t("nextGenTitle")}
          </h2>
          <p className="font-app-body mx-auto mt-7 max-w-[36rem] text-pretty text-lg leading-relaxed text-black sm:mt-10 sm:text-2xl 2xl:mt-10 2xl:w-[36.25rem] 2xl:max-w-none 2xl:leading-[2.25rem]">
            {t("nextGenDescription")}
          </p>
        </div>
      </div>
      <p className="font-app-body relative mx-auto mt-12 max-w-[42rem] whitespace-pre-line text-center text-xs leading-relaxed text-[#525252] sm:mt-16 sm:text-base 2xl:absolute 2xl:left-[75%] 2xl:top-[87.8049%] 2xl:mt-0 2xl:w-[31.4583%] 2xl:max-w-none 2xl:-translate-x-1/2 2xl:leading-normal">
        {t("nextGenDisclaimer")}
      </p>
    </section>
  );
}
