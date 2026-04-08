"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Landing 英雄区
 * 始终完整显示背景图，不使用绝对定位
 */
export default function HeroSection() {
  const t = useTranslations("beforeloginV2.hero");

  return (
    <section className="pb-4 pt-0">
      <div className="w-full shadow-sm">
        <div className="mx-auto grid w-full">
          <Image
            src="/landing/hero/hero.png"
            alt="DeepBrain Tech hero background"
            width={1920}
            height={1080}
            priority
            className="col-start-1 row-start-1 h-auto w-full"
          />

          <div className="col-start-1 row-start-1 flex items-start">
            <div className="w-full max-w-[80%] pl-[7.1%] pt-[14.6%]">
              <h2
                className="whitespace-nowrap text-4xl sm:text-6xl lg:text-8xl font-normal font-[var(--font-titan-one)] leading-[1.2] tracking-[8px] text-sky-700"
                style={{ fontFamily: "var(--font-titan-one), cursive" }}
              >
                {t("title")}
              </h2>
              <p
                className="mt-6 max-w-3xl text-2xl font-normal font-[var(--font-outfit)] leading-10 tracking-widest text-sky-700"
                style={{ fontFamily: "var(--font-outfit), sans-serif" }}
              >
                {t("description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
