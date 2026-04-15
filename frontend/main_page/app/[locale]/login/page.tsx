"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import CompleteProfileDialog from "@/components/features/profile/CompleteProfileDialog";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [completeProfileUsername, setCompleteProfileUsername] = useState("");
  const isGoogleLoginEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const resolveApiErrorMessage = (detail: unknown, fallback: string) => {
    if (typeof detail === "string") {
      return /^[A-Z_]+$/.test(detail) ? t(`auth.${detail}`) : detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "msg" in first) {
        const message = (first as { msg?: unknown }).msg;
        if (typeof message === "string" && message.trim()) return message;
      }
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    return fallback;
  };

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
        const errorMessage = resolveApiErrorMessage(errorData?.detail, t("login.loginFailed"));
        throw new Error(errorMessage);
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_expires_in", String(data.expires_in));

      if (rememberMe) {
        localStorage.setItem("remember_me", "true");
      } else {
        localStorage.removeItem("remember_me");
      }

      router.push(`/${locale}/home`);
    } catch (err: any) {
      setError(err.message || t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-16 bottom-12 h-56 w-56 rounded-full bg-gradient-to-br from-sky-200 to-blue-300 opacity-50 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-gradient-to-br from-blue-100 to-cyan-200 opacity-40 blur-3xl" />

      <main className="relative w-full max-w-[430px] overflow-hidden rounded-[30px] border border-white/50 bg-white/95 p-7 shadow-[0_30px_60px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)]">
            <Image src="/login/Icon.svg" alt="DBT icon" width={46} height={46} priority />
          </div>
          <h1 className="text-3xl font-bold tracking-wide text-slate-900">{t("login.title")}</h1>
          <p className="mt-2 text-base text-slate-500">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="block text-base font-medium text-slate-700">
              {t("login.username")}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={t("login.usernamePlaceholder")}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-base font-medium text-slate-700">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("login.passwordPlaceholder")}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/forgot-password`)}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {t("login.forgotPassword")}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.55)] transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("login.buttonLoading") : t("login.button")}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-sm text-slate-400">{t("login.orContinueWith")}</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex justify-center">
          <div className="relative w-[320px]">
            <div
              className={`pointer-events-none flex h-12 items-center justify-center gap-3 rounded-xl border px-4 text-base font-semibold ${
                isGoogleLoginEnabled
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-200 bg-slate-100 text-slate-400"
              }`}
            >
              <Image src="/login/google.svg" alt="Google" width={22} height={22} />
              <span>{t("login.signInWithGoogle")}</span>
            </div>

            {isGoogleLoginEnabled ? (
              <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0">
                <GoogleLoginButton
                  variant="signin"
                  onSuccess={(opts) => {
                    if (opts.needsProfileCompletion) {
                      setCompleteProfileUsername(opts.username ?? "");
                      setShowCompleteProfile(true);
                    } else {
                      router.push(`/${locale}/home`);
                    }
                  }}
                  onError={(code) => setError(t(`auth.${code}`))}
                  disabled={loading}
                />
              </div>
            ) : null}
          </div>
        </div>
        {!isGoogleLoginEnabled && (
          <p className="mt-2 text-center text-xs text-slate-500">{t("auth.AUTH_GOOGLE_NOT_CONFIGURED")}</p>
        )}

        <div className="mt-7 text-center text-sm text-slate-600">
          <span>{t("login.noAccount")} </span>
          <button
            onClick={() => router.push(`/${locale}/register`)}
            className="font-semibold text-blue-600 hover:underline"
          >
            {t("login.registerLink")}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            {t("common.back")}
          </button>
        </div>

        <CompleteProfileDialog
          open={showCompleteProfile}
          initialUsername={completeProfileUsername}
          onClose={() => setShowCompleteProfile(false)}
          onSuccess={() => {
            setShowCompleteProfile(false);
            router.push(`/${locale}/home`);
          }}
        />
      </main>
    </div>
  );
}
