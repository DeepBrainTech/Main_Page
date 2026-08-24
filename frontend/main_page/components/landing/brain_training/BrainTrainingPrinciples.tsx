import { useTranslations } from "next-intl";
import Image from "next/image";
import CheckerBackground from "../shared/CheckerBackground";

const CARD_STYLES = [
  "bg-[#3987FC] 2xl:rotate-[-1.91deg]",
  "bg-[#FFD561] 2xl:rotate-[1.43deg]",
  "bg-[#FFAEFF] 2xl:-translate-y-8 2xl:rotate-[-0.83deg]",
  "bg-[#47B747] 2xl:-translate-y-10 2xl:rotate-[1.29deg]",
] as const;

function splitLeadSentence(description: string) {
  const punctuation = description.includes("。") ? "。" : ".";
  const endIndex = description.indexOf(punctuation);

  if (endIndex === -1) {
    return { lead: description, remainder: "" };
  }

  return {
    lead: description.slice(0, endIndex + 1),
    remainder: description.slice(endIndex + 1).trim(),
  };
}

/** Science-backed principles displayed below the social-proof marquee. */
export default function BrainTrainingPrinciples() {
  const t = useTranslations("figmaHome");
  const cards = [
    { title: t("principleClassicTitle"), description: t("principleClassicDescription") },
    { title: t("principleWhyTitle"), description: t("principleWhyDescription") },
    { title: t("principleNeuroplasticityTitle"), description: t("principleNeuroplasticityDescription") },
    { title: t("principleGamifiedTitle"), description: t("principleGamifiedDescription") },
  ];

  return (
    <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-20 lg:py-32">
      <CheckerBackground />
      <div className="relative mx-auto grid w-full max-w-[120rem] items-center gap-12 2xl:grid-cols-[minmax(0,49.6875rem)_minmax(0,1fr)] 2xl:gap-[clamp(4rem,4.4vw,5.3125rem)]">
        <div className="max-w-[42rem] lg:max-w-[49.6875rem] 2xl:max-w-[49.6875rem]">
          <Image
            src="/landing/logo.svg"
            alt=""
            width={59}
            height={56}
            aria-hidden="true"
            className="mb-7 h-[56px] w-[59px] object-contain sm:mb-9 lg:mb-5"
          />
          <h2 className="font-figma-heading text-4xl font-bold leading-tight text-black sm:text-5xl">
            {t("principlesTitle")}
          </h2>
          <p className="font-app-body mt-7 max-w-[36.25rem] text-pretty text-lg font-normal leading-relaxed text-black sm:text-2xl 2xl:mt-10">
            {t("principlesDescription")}
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6 2xl:w-[calc(100%+clamp(4rem,10vw,14rem))] 2xl:space-y-0">
          {cards.map((card, index) => (
            <article key={card.title} className={`rounded-[40px] px-6 py-6 text-black transition-transform sm:px-10 sm:py-8 2xl:px-[3.25rem] 2xl:pb-10 2xl:pt-6 ${CARD_STYLES[index]}`}>
              <h3 className="font-figma-heading text-xl font-bold leading-snug sm:text-2xl">{card.title}</h3>
              <p className="font-app-body mt-3 text-lg font-normal leading-normal sm:text-2xl lg:max-w-[52rem] 2xl:max-w-[52rem]">
                <strong className="font-semibold">{splitLeadSentence(card.description).lead}</strong>
                {splitLeadSentence(card.description).remainder ? ` ${splitLeadSentence(card.description).remainder}` : null}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
