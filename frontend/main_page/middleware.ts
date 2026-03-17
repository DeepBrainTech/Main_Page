import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n-config';

export default createMiddleware({
  // 支持的语言列表
  locales,

  // 默认语言
  defaultLocale,

  // 总是显示语言前缀（如 /zh, /en）
  localePrefix: 'always'
});

export const config = {
  // 匹配页面路由，排除 API、Next 内部资源和所有静态文件（含 public 下图片）
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
