import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '../../i18n-config';

export async function generateStaticParams(): Promise<Array<{ locale: Locale }>> {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

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
