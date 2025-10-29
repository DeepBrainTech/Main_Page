import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

// 支持的语言列表
export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

// 默认语言
export const defaultLocale: Locale = 'zh';

// 获取语言配置
export default getRequestConfig(async () => {
  // 从 headers 中获取 locale（Next.js 15 需要使用 await headers()）
  const headersList = await headers();
  const locale = headersList.get('x-next-intl-locale') || defaultLocale;
  
  // 验证传入的 locale 参数
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./language/${locale}.json`)).default
  };
});
