"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  const [step, setStep] = useState(1); // 1: 输入邮箱, 2: 输入验证码和新密码
  const [formData, setFormData] = useState({
    email: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

  const handleSendCode = async () => {
    setError("");
    setSuccessMessage("");

    // 验证邮箱
    if (!formData.email) {
      setError(t("forgotPassword.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t("forgotPassword.emailInvalid"));
      return;
    }

    setSendingCode(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/send-reset-password-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          language: locale === "zh" ? "zh" : "en",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.detail || "forgotPassword.resetFailed";
        
        const errorMessage = errorCode.match(/^[A-Z_]+$/) 
          ? t(`auth.${errorCode}`) 
          : errorCode;
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // 发送成功
      setSuccessMessage(t("forgotPassword.verificationCodeSent"));
      setCountdown(60);
      setStep(2); // 进入下一步
    } catch (err) {
      if (!error) {
        const errorMessage = err instanceof Error ? err.message : t("forgotPassword.resetFailed");
        setError(errorMessage);
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // 验证
    if (!formData.verificationCode) {
      setError(t("forgotPassword.verificationCodeRequired"));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t("forgotPassword.passwordMismatch"));
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(t("forgotPassword.passwordTooShort"));
      return;
    }

    setResetting(true);

    try {
      const response = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          verification_code: formData.verificationCode,
          new_password: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.detail || "forgotPassword.resetFailed";
        
        const errorMessage = errorCode.match(/^[A-Z_]+$/) 
          ? t(`auth.${errorCode}`) 
          : errorCode;
        
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // 重置成功
      setSuccessMessage(t("forgotPassword.resetSuccess"));
      
      // 2秒后跳转到登录页
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 2000);
    } catch (err) {
      if (!error) {
        const errorMessage = err instanceof Error ? err.message : t("forgotPassword.resetFailed");
        setError(errorMessage);
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md px-6 py-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            {t("forgotPassword.title")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t("forgotPassword.subtitle")}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {step === 1 ? (
          // 第一步：输入邮箱
          <div className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("forgotPassword.email")}
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
                placeholder={t("forgotPassword.emailPlaceholder")}
              />
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0}
              className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingCode
                ? t("forgotPassword.sendingCode")
                : countdown > 0
                ? t("forgotPassword.resendCode", { seconds: countdown })
                : t("forgotPassword.sendCode")}
            </button>
          </div>
        ) : (
          // 第二步：输入验证码和新密码
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("forgotPassword.email")}
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                disabled
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("forgotPassword.verificationCode")}
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
                  placeholder={t("forgotPassword.verificationCodePlaceholder")}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {sendingCode
                    ? t("forgotPassword.sendingCode")
                    : countdown > 0
                    ? t("forgotPassword.resendCode", { seconds: countdown })
                    : t("forgotPassword.sendCode")}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("forgotPassword.newPassword")}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
                placeholder={t("forgotPassword.newPasswordPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("forgotPassword.confirmPassword")}
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
                placeholder={t("forgotPassword.confirmPasswordPlaceholder")}
              />
            </div>

            <button
              type="submit"
              disabled={resetting}
              className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? t("forgotPassword.resetting") : t("forgotPassword.resetPassword")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
          >
            {t("forgotPassword.backToLogin")}
          </button>
        </div>
      </main>
    </div>
  );
}
