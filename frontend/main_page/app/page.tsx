import type { Metadata } from "next";
import { defaultLocale } from "@/i18n-config";
import { redirect } from "@/lib/i18n-navigation";

export const metadata: Metadata = {
  title: "DeepBrain Tech",
  description: "DeepBrain Tech",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootPage() {
  redirect({ href: "/", locale: defaultLocale });
}
