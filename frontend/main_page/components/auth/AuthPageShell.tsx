"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n-navigation";
import AuthPuzzleArtwork from "./AuthPuzzleArtwork";

type AuthPageShellProps = {
  children: ReactNode;
  contentClassName?: string;
};

/** Shared responsive frame for the sign-in and sign-up pages. */
export default function AuthPageShell({
  children,
  contentClassName = "items-center py-10",
}: AuthPageShellProps) {
  const t = useTranslations("figmaHome");

  return (
    <div className="min-h-[100dvh] bg-white font-app-body lg:grid lg:grid-cols-2">
      <section className="flex min-h-[100dvh] flex-col px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex h-16 w-fit shrink-0 items-center" aria-label="DeepBrain Technology home">
          <Image
            src="/dashboard/logo.png"
            alt="DeepBrain Technology"
            width={197}
            height={60}
            priority
            className="h-[60px] w-[197px] max-w-full object-contain object-left"
          />
        </Link>

        <div className={`flex flex-1 justify-center ${contentClassName}`}>
          <div className="w-full max-w-[30rem]">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-6 text-center text-xs leading-5 text-[#818181] sm:text-sm">
          <span>{t("copyright")}</span>
          <span className="text-[#3692f6]">{t("terms")}</span>
          <span className="text-[#9e9e9e]">|</span>
          <span className="text-[#3692f6]">{t("policy")}</span>
        </footer>
      </section>

      <aside className="hidden min-h-[100dvh] flex-col items-start py-6 pr-6 lg:flex">
        <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[20px] bg-[#fffbed]">
          <AuthPuzzleArtwork layout="looping" />
        </div>
      </aside>
    </div>
  );
}
