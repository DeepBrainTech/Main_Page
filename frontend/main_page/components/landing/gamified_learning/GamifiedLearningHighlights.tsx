import Image from "next/image";
import { useTranslations } from "next-intl";

const HIGHLIGHTS = [
  { key: "highlightsTests", icon: "frame-1689-cognitive-tests.svg" },
  { key: "highlightsCourses", icon: "frame-1689-online-courses.svg" },
  { key: "highlightsGames", icon: "frame-1689-brain-games.svg" },
  { key: "highlightsTools", icon: "frame-1689-ai-tools.svg" },
] as const;

const ASSET_PATH = "/landing/gamified_learning";

/** Four product highlights shown immediately above the next-generation training banner. */
export default function GamifiedLearningHighlights() {
  const t = useTranslations("figmaHome");

  return (
    <section className="relative bg-white px-5 py-12 sm:px-8 sm:py-16 xl:px-12 2xl:px-20 2xl:py-20">
      <div className="mx-auto grid w-full max-w-[120rem] grid-cols-1 gap-10 sm:grid-cols-2 2xl:flex 2xl:items-center 2xl:justify-between 2xl:gap-0">
        {HIGHLIGHTS.map((highlight) => (
          <div key={highlight.key} className="flex min-w-0 items-center gap-5 2xl:flex-none 2xl:gap-6">
            <Image
              src={`${ASSET_PATH}/${highlight.icon}`}
              alt=""
              width={60}
              height={60}
              className="size-[60px] shrink-0"
              aria-hidden="true"
            />
            <p className="font-app-body min-w-0 text-lg font-normal capitalize leading-tight text-[#1a1a1a] sm:text-xl 2xl:text-2xl">
              {t(highlight.key)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
