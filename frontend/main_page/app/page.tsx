import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n-config";

export const metadata: Metadata = {
  title: "DeepBrain Tech",
  description: "DeepBrain Tech",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
