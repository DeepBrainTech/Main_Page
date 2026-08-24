"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function LandingFooter() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("figmaHome");
  const groups = [
    { title: t("districts"), links: [t("districtTechnology"), t("districtAcademy")] },
    { title: t("browse"), links: [t("games"), t("courses"), t("tests")] },
    { title: t("about"), links: [t("aboutUs"), t("leadership"), t("careers"), t("blog"), t("contact")] },
  ];

  return (
    <footer id="contact" className="w-full bg-[#1a1a1a] px-[clamp(1.25rem,4.1667vw,5rem)] py-[clamp(4rem,6.25vw,7.5rem)] text-white">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-[clamp(4rem,6.25vw,7.5rem)] font-app-body">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6875fr))] lg:gap-x-[clamp(3rem,8.3333vw,10rem)]">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-white">
              <Image
                src="/landing/logo.svg"
                alt="DeepBrain Technology"
                width={84}
                height={80}
                className="h-[clamp(3.75rem,4.1667vw,5rem)] w-[clamp(4rem,4.375vw,5.25rem)] shrink-0 object-contain"
              />
              <div className="leading-none">
                <span className="font-['Baloo'] block text-[clamp(2rem,1.8vw,2.16075rem)] font-normal">DeepBrain</span>
                <span className="font-['Baloo_2'] mt-1 block text-[clamp(1.25rem,1.2vw,1.4405rem)] font-medium">Technology</span>
              </div>
            </div>
            <p className="mt-[clamp(2rem,3.125vw,3.75rem)] max-w-[29.4375rem] text-[clamp(1rem,1.0417vw,1.25rem)] font-normal leading-[1.4] text-white">
              {t("footerDescription")}
            </p>
          </div>
          {groups.map((group) => (
            <div key={group.title} className="min-w-0">
              <h2 className="text-[clamp(1rem,1.0417vw,1.25rem)] font-semibold leading-[1.4] text-white/70">{group.title}</h2>
              <ul className="mt-5 flex flex-col gap-5 text-[clamp(1rem,1.0417vw,1.25rem)] font-medium leading-[1.4]">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-[#ffdd65]">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5 text-[clamp(0.875rem,1.0417vw,1.25rem)] font-extralight leading-[1.4] text-white">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-[clamp(1.5rem,2.0833vw,2.5rem)]">
            <a href={`/${locale}/privacy-policy`} className="transition-colors hover:text-[#ffdd65]">{t("policy")}</a>
            <a href="#" className="transition-colors hover:text-[#ffdd65]">{t("terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
