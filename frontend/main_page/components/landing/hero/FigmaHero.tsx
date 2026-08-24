"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import CheckerBackground from "../shared/CheckerBackground";
import LandingButton from "./LandingButton";

interface FigmaHeroProps {
  onStart: () => void;
}

const HERO_PIECES = [
  { src: "/landing/hero/Pawn.svg", alt: "Armored pawn", width: 34, height: 40 },
  { src: "/landing/hero/Rook.svg", alt: "Armored rook", width: 34, height: 40 },
  { src: "/landing/hero/Knight.svg", alt: "Purple knight", width: 34, height: 45 },
  { src: "/landing/hero/red-king.svg", alt: "Red king", width: 34, height: 43 },
  { src: "/landing/hero/dark-king.svg", alt: "Dark king", width: 34, height: 48 },
] as const;

export default function FigmaHero({ onStart }: FigmaHeroProps) {
  const t = useTranslations("figmaHome");

  return (
    <section className="relative isolate overflow-hidden bg-white px-5 pb-24 pt-36 sm:px-8 md:pb-36 md:pt-48">
      <CheckerBackground />
      <div className="relative mx-auto flex w-full max-w-[873px] flex-col items-center text-center">
        <div className="mb-7 flex h-12 items-center gap-5" aria-label="DeepBrain game pieces">
          {HERO_PIECES.map((piece) => (
            <Image
              key={piece.src}
              src={piece.src}
              alt={piece.alt}
              width={piece.width}
              height={piece.height}
              className="h-auto w-[2.125rem] object-contain"
            />
          ))}
        </div>
        <h1 className="font-figma-heading max-w-4xl text-balance text-4xl font-bold leading-[1.09] tracking-[-0.045em] text-[#1a1a1a] sm:text-6xl lg:text-[5.5rem]">
          {t("heroTitle")}
        </h1>
        <p className="font-app-body mt-8 w-full max-w-[773px] text-center text-[clamp(1rem,1.25vw,1.5rem)] leading-normal text-[#1a1a1a]">
          <span className="block min-[480px]:whitespace-nowrap">{t("heroDescriptionLineOne")}</span>
          <span className="block min-[480px]:whitespace-nowrap">{t("heroDescriptionLineTwo")}</span>
        </p>
        <LandingButton onClick={onStart} className="mt-12">{t("heroCta")}</LandingButton>
      </div>
    </section>
  );
}
