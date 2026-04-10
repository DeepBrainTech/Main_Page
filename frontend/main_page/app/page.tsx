import LanguageLanding from "@/components/LanguageLanding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose Language",
  description: "Select your preferred language for DeepBrain Tech.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootPage() {
  return <LanguageLanding />;
}
