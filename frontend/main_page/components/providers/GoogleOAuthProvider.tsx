"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/** 将路由 locale (zh/en) 映射为 Google 的 hl 语言码 */
function toGoogleLocale(locale: string): string {
  if (locale === "zh") return "zh_CN";
  return locale === "en" ? "en" : "en";
}

/**
 * 仅当配置了 NEXT_PUBLIC_GOOGLE_CLIENT_ID 时包装 Google OAuth，否则直接渲染子组件。
 * locale 与页面语言一致，Google 按钮文案会显示对应语言。
 */
export default function GoogleAuthProvider({
  children,
  locale = "en",
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  if (!clientId) {
    return <>{children}</>;
  }
  return (
    <GoogleOAuthProvider clientId={clientId} locale={toGoogleLocale(locale)}>
      {children}
    </GoogleOAuthProvider>
  );
}
