"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";

// 注意：客户端组件默认就是动态渲染，适合注册页的需求
// （CSRF、会话、A/B测试、风控等）
export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    verificationCode: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSendCode = async () => {
    setError("");
    setSuccessMessage("");

    // 验证邮箱
    if (!formData.email) {
      setError(t("register.emailRequired"));
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t("register.emailInvalid"));
      return;
    }

    setSendingCode(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/send-verification-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          language: locale === "zh" ? "zh" : "en",  // 根据页面语言发送对应语言的邮件
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.detail || "register.registerFailed";
        
        const errorMessage = errorCode.match(/^[A-Z_]+$/) 
          ? t(`auth.${errorCode}`) 
          : errorCode;
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // 发送成功
      setSuccessMessage(t("register.verificationCodeSent"));
      setCountdown(60); // 60秒倒计时
    } catch (err) {
      if (!error) {
        const errorMessage = err instanceof Error ? err.message : t("register.registerFailed");
        setError(errorMessage);
      }
    } finally {
      setSendingCode(false);
    }
  };

  // 倒计时效果
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("register.passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          verification_code: formData.verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.detail || "register.registerFailed";
        
        // 如果返回的是错误代码（全大写+下划线），则从语言文件中翻译
        const errorMessage = errorCode.match(/^[A-Z_]+$/) 
          ? t(`auth.${errorCode}`) 
          : errorCode;
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // 注册成功，自动登录
      const result = await response.json();
      
      // 后端返回的数据在 result.data 中
      if (result.data && result.data.access_token) {
        localStorage.setItem("access_token", result.data.access_token);
        localStorage.setItem("token_expires_in", String(result.data.expires_in || 3600));
        router.push(`/${locale}/home`);
      } else {
        // 如果没有 token，跳转到登录页
        router.push(`/${locale}/login?registered=true`);
      }
    } catch (err) {
      // 错误已在上面的 if 中设置
      if (!error) {
        const errorMessage = err instanceof Error ? err.message : t("register.registerFailed");
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md px-6 py-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            {t("register.title")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{t("register.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("register.username")}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("register.usernamePlaceholder")}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("register.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("register.emailPlaceholder")}
            />
          </div>

          <div>
            <label
              htmlFor="verificationCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("register.verificationCode")}
            </label>
            <div className="flex gap-2">
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                value={formData.verificationCode}
                onChange={handleChange}
                required
                maxLength={6}
                autoComplete="off"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
                placeholder={t("register.verificationCodePlaceholder")}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {sendingCode
                  ? t("register.sendingCode")
                  : countdown > 0
                  ? t("register.resendCode", { seconds: countdown })
                  : t("register.sendCode")}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("register.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("register.passwordPlaceholder")}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t("register.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder={t("register.confirmPasswordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("register.buttonLoading") : t("register.button")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("register.hasAccount")}{" "}
            <button
              onClick={() => router.push(`/${locale}/login`)}
              className="text-black dark:text-white font-medium hover:underline"
            >
              {t("register.loginLink")}
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
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
