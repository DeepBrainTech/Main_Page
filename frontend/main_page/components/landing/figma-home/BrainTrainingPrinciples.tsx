import { useTranslations } from "next-intl";
import Image from "next/image";
import CheckerBackground from "./CheckerBackground";

const CARD_STYLES = [
  "bg-[#3987FC] lg:absolute lg:left-[960px] lg:top-[36px] lg:w-[1108.079px] lg:rotate-[-1.91deg]",
  "bg-[#FFD561] lg:absolute lg:left-[970px] lg:top-[316px] lg:w-[1076.209px] lg:rotate-[1.43deg]",
  "bg-[#FFAEFF] lg:absolute lg:left-[976px] lg:top-[566px] lg:w-[1082.401px] lg:rotate-[-0.83deg]",
  "bg-[#47B747] lg:absolute lg:left-[955.918px] lg:top-[801.46px] lg:w-[1091.217px] lg:rotate-[1.29deg]",
] as const;

const CARD_TEXT_WIDTHS = ["lg:w-[850.963px]", "lg:w-[813.359px]", "lg:w-[793.685px]", "lg:w-[848.482px]"] as const;

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
    <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 sm:py-28 lg:h-[1107px] lg:px-0 lg:py-0">
      <CheckerBackground />
      <div className="relative mx-auto grid w-full max-w-[120rem] items-center gap-12 lg:block lg:h-full lg:max-w-none">
        <div className="max-w-[42rem] lg:absolute lg:left-20 lg:top-[307px] lg:w-[795px] lg:max-w-none">
          <Image
            src="/landing/hero/logo.svg"
            alt=""
            width={59}
            height={56}
            aria-hidden="true"
            className="mb-7 h-[56px] w-[59px] object-contain sm:mb-9 lg:mb-5"
          />
          <h2 className="font-figma-heading text-[48px] font-bold leading-[60px] text-black">
            {t("principlesTitle")}
          </h2>
          <p className="font-app-body mt-7 max-w-[34rem] text-pretty text-[24px] font-normal leading-[36px] text-black lg:mt-10 lg:w-[580px] lg:max-w-none">
            {t("principlesDescription")}
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6 lg:absolute lg:inset-0 lg:space-y-0">
          {cards.map((card, index) => (
            <article key={card.title} className={`rounded-[40px] px-6 py-6 text-black transition-transform sm:px-10 sm:py-8 lg:px-[3.25rem] lg:pb-10 lg:pt-6 ${CARD_STYLES[index]}`}>
              <h3 className="font-figma-heading text-[24px] font-bold leading-[60px]">{card.title}</h3>
              <p className={`font-app-body mt-0 text-[24px] font-normal leading-[normal] ${CARD_TEXT_WIDTHS[index]}`}>
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
