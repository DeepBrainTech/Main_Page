"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

// 注意：客户端组件默认就是动态渲染，适合登录页的需求
// （CSRF、会话、安全验证等）
export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 如果返回的是错误代码（全大写+下划线），则从语言文件中翻译
        const errorCode = errorData.detail || "login.invalidCredentials";
        const errorMessage = errorCode.match(/^[A-Z_]+$/) 
          ? t(`auth.${errorCode}`) 
          : errorCode;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 保存 token 到 localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_expires_in", String(data.expires_in));

      // 登录成功，直接跳转到 home 页面
      router.push(`/${locale}/home`);
    } catch (err: any) {
      setError(err.message || t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md px-6 py-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            {t("login.title")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("login.username")}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("login.usernamePlaceholder")}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("login.password")}
              </label>
              <button
                type="button"
                onClick={() => router.push(`/${locale}/forgot-password`)}
                className="text-sm text-black dark:text-white hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("login.passwordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("login.buttonLoading") : t("login.button")}
          </button>
        </form>

        <div className="flex flex-col items-center w-full my-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                {t("login.orContinueWith")}
              </span>
            </div>
          </div>

          {/* Google 登录：仅当配置了 Client ID 时显示 */}
          <div className="w-full flex justify-center mt-4">
            <GoogleLoginButton
              variant="signin"
              onSuccess={() => router.push(`/${locale}/home`)}
              onError={(code) => setError(t(`auth.${code}`))}
              disabled={loading}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("login.noAccount")}{" "}
            <button
              onClick={() => router.push(`/${locale}/register`)}
              className="text-black dark:text-white font-medium hover:underline"
            >
              {t("login.registerLink")}
            </button>
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            {t("common.back")}
          </button>
        </div>
      </main>
    </div>
  );
}
