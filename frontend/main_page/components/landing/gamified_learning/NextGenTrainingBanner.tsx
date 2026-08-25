import Image from "next/image";
import { useTranslations } from "next-intl";
import CheckerBackground from "../shared/CheckerBackground";

/** Feature banner for teen and young-adult focused brain training. */
export default function NextGenTrainingBanner() {
  const t = useTranslations("figmaHome");

  return (
    <section className="next-gen-section relative isolate overflow-hidden bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
      <CheckerBackground layout="frame1688" />
      <div className="next-gen-content relative mx-auto flex w-full max-w-[120rem] flex-col items-center">
        <div className="next-gen-art relative aspect-[1920/1996] w-[min(100%,55rem)] max-w-full">
          <Image
            src="/landing/next_gen/group-1695.png"
            alt=""
            fill
            sizes="(min-width: 1600px) 50vw, 55rem"
            className="object-contain object-top"
            aria-hidden="true"
          />
        </div>

        <div className="next-gen-copy mx-auto w-full max-w-[50rem] text-center">
          <div className="font-app-body inline-flex items-center gap-3 text-lg text-black sm:text-2xl">
            <Image src="/landing/next_gen/next-gen-binoculars.svg" alt="" width={40} height={40} className="size-8 object-contain sm:size-10" aria-hidden="true" />
            <span>{t("nextGenEyebrow")}</span>
          </div>
          <h2 className="next-gen-title font-figma-heading mt-7 whitespace-pre-line text-4xl font-bold leading-tight text-black sm:mt-10 sm:text-5xl">
            {t("nextGenTitle")}
          </h2>
          <p className="next-gen-description font-app-body mx-auto mt-7 max-w-[36rem] text-pretty text-lg leading-relaxed text-black sm:mt-10 sm:text-2xl">
            {t("nextGenDescription")}
          </p>

        </div>

        <p className="next-gen-disclaimer font-app-body relative mx-auto mt-12 max-w-[42rem] whitespace-pre-line text-center text-xs leading-relaxed text-[#525252] sm:mt-16 sm:text-base">
          {t("nextGenDisclaimer")}
        </p>
      </div>
    </section>
  );
}
