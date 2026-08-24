"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

/** Continuously scrolling social-proof strip based on Figma node 1298:7510. */
export default function TrustMarquee() {
  const t = useTranslations("figmaHome");
  const items = [
    { icon: "/landing/trust_marquee/union-icon.svg", width: 32, height: 28, text: t("trustFounded") },
    { icon: "/landing/trust_marquee/Subtract.svg", width: 34, height: 34, text: t("trustClassrooms") },
  ];

  const sequence = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item) => (
        <div key={item.text} className="flex shrink-0 items-center gap-10">
          <Image src={item.icon} alt="" width={item.width} height={item.height} className="shrink-0" aria-hidden="true" />
          <span className="font-app-body whitespace-nowrap text-base font-normal text-[#fff5f0] sm:text-2xl">{item.text}</span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="mt-[clamp(2.5rem,4.1667vw,5rem)] h-20 w-full overflow-hidden bg-[#1a1a1a]" aria-label={t("trustStripLabel")}>
      <div className="animate-landing-marquee flex h-full w-max items-center">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} aria-hidden={index > 0}>
            {sequence}
          </div>
        ))}
      </div>
    </section>
  );
}
