import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n-routing";

export default createMiddleware(routing);

export const config = {
  // 匹配页面路由，排除 API、Next 内部资源和所有静态文件（含 public 下图片）
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)']
};
