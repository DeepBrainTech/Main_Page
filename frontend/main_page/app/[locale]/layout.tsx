import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '../../i18n-config';
import GoogleAuthProvider from '@/components/providers/GoogleOAuthProvider';
import type { Metadata } from "next";

// Cloudflare Pages 需要 Edge Runtime
export const runtime = 'edge';

const localeMetadata: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "DeepBrain Tech | AI Cognitive Training Platform",
    description:
      "Train focus, memory, logic, and strategy with AI-powered brain games and personalized cognitive practice.",
    ogLocale: "en_US",
  },
  zh: {
    title: "DeepBrain Tech | AI 认知训练平台",
    description: "通过 AI 脑力训练游戏提升专注力、记忆力、逻辑能力与策略思维。",
    ogLocale: "zh_CN",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = locales.includes(localeParam as Locale) ? (localeParam as Locale) : "en";
  const content = localeMetadata[locale];

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      locale: content.ogLocale,
      alternateLocale: locale === "en" ? ["zh_CN"] : ["en_US"],
      url: `/${locale}`,
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        zh: "/zh",
        "x-default": "/en",
      },
    },
  };
}

// 注意：不在 layout 中使用 generateStaticParams
// 注册和登录页面需要动态渲染（CSRF、会话、风控等）
// 静态生成应该在具体页面的 page.tsx 中配置

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  
  // 验证 locale 是否在支持的语言列表中
  if (!locales.includes(localeParam as Locale)) {
    notFound();
  }
  
  // 现在 localeParam 已经通过验证，可以安全地转换为 Locale 类型
  const locale = localeParam as Locale;

  // 获取当前语言的翻译消息
  const messages = await getMessages({ locale });

  // 在 Next.js App Router 中，子 layout 不应该包含 <html> 和 <body>
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <GoogleAuthProvider locale={locale}>
        <div className={`min-h-0 flex-1 ${locale === "zh" ? "locale-zh" : "locale-en"}`}>{children}</div>
      </GoogleAuthProvider>
    </NextIntlClientProvider>
  );
}
