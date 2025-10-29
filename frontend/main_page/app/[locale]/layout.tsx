import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '../../i18n-config';

// Cloudflare Pages 需要 Edge Runtime
export const runtime = 'edge';

export async function generateStaticParams(): Promise<Array<{ locale: string }>> {
  return locales.map((locale) => ({ locale }));
}

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

  // 注意：在 Next.js App Router 中，子 layout 不应该包含 <html> 和 <body>
  // 这些应该只在根 layout 中定义
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
