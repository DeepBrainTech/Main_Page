"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import CheckerBackground from "../shared/CheckerBackground";

type DecorationConfig = {
  src: string;
  width: number;
  height: number;
  className: string;
};

const DECORATIONS: DecorationConfig[] = [
  {
    src: "/landing/gamified_learning/pink.svg",
    width: 125,
    height: 125,
    className: "left-[17.3703%] top-[5.1045%]",
  },
  {
    src: "/landing/gamified_learning/green.svg",
    width: 150,
    height: 136,
    className: "left-[80.5729%] top-[16.9828%]",
  },
  {
    src: "/landing/gamified_learning/yellow.svg",
    width: 132,
    height: 132,
    className: "left-[86.4599%] top-[34.3289%]",
  },
  {
    src: "/landing/gamified_learning/blue.svg",
    width: 190,
    height: 196,
    className: "left-[5.3%] top-[36.5rem]",
  },
];

function PuzzleDecoration({ decoration }: { decoration: DecorationConfig }) {
  return (
    <div className={`pointer-events-none absolute hidden 2xl:block ${decoration.className}`} aria-hidden="true">
      <Image src={decoration.src} alt="" width={decoration.width} height={decoration.height} className="block h-auto w-auto" />
    </div>
  );
}

export default function GameCategoriesShowcase() {
  const tHome = useTranslations("figmaHome");

  return (
    <section className="relative isolate overflow-hidden rounded-[3.75rem] bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28 2xl:min-h-[69.2rem] 2xl:px-0 2xl:py-0">
      <CheckerBackground layout="frame1688" />
      <div className="pointer-events-none absolute inset-0 mx-auto w-full max-w-[120rem]">
        {DECORATIONS.map((decoration) => (
          <PuzzleDecoration key={decoration.src} decoration={decoration} />
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-[89.5rem] flex-col items-center gap-10 text-center 2xl:absolute 2xl:left-1/2 2xl:top-1/2 2xl:w-[89.5rem] 2xl:-translate-x-1/2 2xl:-translate-y-[calc(50%+0.9rem)] 2xl:gap-10">
        <header>
          <h2 className="font-figma-heading text-balance text-4xl font-bold leading-tight text-[#1a1a1a] sm:text-5xl 2xl:text-[3rem] 2xl:leading-[3.75rem]">{tHome("gameCategoriesTitle")}</h2>
          <p className="font-app-body mt-2 text-base text-[#1a1a1a] sm:text-xl 2xl:text-2xl">{tHome("gameCategoriesSubtitle")}</p>
        </header>

        <div className="w-full max-w-[71.6rem]">
          <Image
              src="/landing/gamified_learning/group-1682.png"
            alt={tHome("gameCategoriesTitle")}
            width={2292}
            height={1408}
            priority
            className="h-auto w-full"
            sizes="(min-width: 1536px) 1146px, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
