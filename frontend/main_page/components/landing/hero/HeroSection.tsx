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
            <div className="absolute left-[7.1%] top-[24.6%] w-[80%]">
              <h2
                className="max-w-[95%] whitespace-nowrap text-sky-700"
                style={{ fontFamily: "var(--font-titan-one), cursive" }}
              >
                <span className="block text-[clamp(1.65rem,5.2vw,5.9rem)] font-normal leading-[1.08] tracking-[clamp(2px,0.45vw,8px)]">
                  {t("title")}
                </span>
              </h2>
              <p
                className="mt-[clamp(0.45rem,1.2vw,1.5rem)] max-w-[58%] text-[clamp(0.55rem,2.1vw,1.8rem)] font-normal leading-[1.45] tracking-[clamp(0.6px,0.12vw,1.8px)] text-sky-700"
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
