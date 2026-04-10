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
        <div className="relative mx-auto w-full">
          <Image
            src="/landing/hero/hero.png"
            alt="DeepBrain Tech hero background"
            width={1920}
            height={1080}
            priority
            className="h-auto w-full"
          />

          <div className="absolute inset-0">
            <div className="absolute left-[6%] top-[22%] w-[88%] min-[480px]:left-[7.1%] min-[480px]:top-[24.6%] min-[480px]:w-[80%]">
              <h2
                className="max-w-[95%] whitespace-normal text-sky-700 min-[480px]:whitespace-nowrap"
                style={{ fontFamily: "var(--font-titan-one), cursive" }}
              >
                <span className="block text-[clamp(1.3rem,5.2vw,5.9rem)] font-normal leading-[1.08] tracking-[clamp(1px,0.45vw,8px)]">
                  {t("title")}
                </span>
              </h2>
              <p
                className="mt-[clamp(0.35rem,1.2vw,1.5rem)] max-w-[70%] text-[clamp(0.72rem,2.1vw,1.8rem)] font-normal leading-[1.4] tracking-[clamp(0.3px,0.12vw,1.8px)] text-sky-700 min-[480px]:max-w-[58%]"
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
