import type { Metadata, Viewport } from "next";
import { Baloo_2, Baloo_Bhai_2, Geist, Geist_Mono, Outfit, Titan_One } from "next/font/google";
import "./globals.css";
import { defaultLocale } from "../i18n-config";
import { getSiteUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const titanOne = Titan_One({
  variable: "--font-titan-one",
  subsets: ["latin"],
  weight: "400",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const baloo = Baloo_Bhai_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "DeepBrain Tech | AI Cognitive Training Platform",
    template: "%s | DeepBrain Tech",
  },
  description:
    "DeepBrain Tech provides AI-powered brain games and cognitive training for focus, memory, strategy, and lifelong learning.",
  applicationName: "DeepBrain Tech",
  alternates: {
    canonical: "/en",
    languages: {
      en: "/en",
      zh: "/zh",
      "x-default": "/en",
    },
  },
  openGraph: {
    type: "website",
    siteName: "DeepBrain Tech",
    title: "DeepBrain Tech | AI Cognitive Training Platform",
    description:
      "Train memory, focus, logic, and strategy with AI-powered brain games and structured cognitive practice.",
    url: "/en",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepBrain Tech | AI Cognitive Training Platform",
    description:
      "AI-powered brain training games for focus, memory, logic, and strategy.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 根 layout：只是渲染 children，因为实际路由在 [locale] 下
  // 如果访问根路径，middleware 会重定向到 /zh 或 /en
  return (
    <html lang={defaultLocale}>
      <body
          className={`${geistSans.variable} ${geistMono.variable} ${titanOne.variable} ${outfit.variable} ${baloo.variable} ${baloo2.variable} antialiased`}
          suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
