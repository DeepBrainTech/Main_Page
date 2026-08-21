"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Landing 页脚
 */
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
    <footer id="contact" className="bg-white text-white">
      <div className="mx-auto max-w-[120rem] bg-[#1a1a1a] px-5 py-16 sm:px-8 sm:py-24">
      <div className="landing-container font-app-body">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3"><span className="flex size-14 items-center justify-center rounded-full bg-[#ffdd65] text-2xl text-[#1a1a1a]">♟</span><span><strong className="block text-2xl">DeepBrain</strong><span>Technology</span></span></div>
            <p className="mt-8 max-w-sm text-lg leading-relaxed text-white/90">{t("footerDescription")}</p>
          </div>
          {groups.map((group) => <div key={group.title}><h2 className="text-sm font-semibold text-white/60">{group.title}</h2><ul className="mt-6 space-y-4 text-lg">{group.links.map((link) => <li key={link}><a href="#" className="hover:text-[#ffdd65]">{link}</a></li>)}</ul></div>)}
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-5 border-t border-white/15 pt-8 text-sm text-white/80"><p>{t("copyright")}</p><div className="flex gap-8"><a href={`/${locale}/privacy-policy`} className="hover:text-white">{t("policy")}</a><a href="#" className="hover:text-white">{t("terms")}</a></div></div>
      </div>
      </div>
    </footer>
  );
}
