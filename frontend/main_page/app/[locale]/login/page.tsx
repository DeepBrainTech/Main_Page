"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import AuthPageShell from "@/components/auth/AuthPageShell";
import AuthTextField from "@/components/auth/AuthTextField";
import CompleteProfileDialog from "@/components/features/profile/CompleteProfileDialog";

export default function LoginPage() {
  const router = useRouter();
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
      formData.append("remember_me", String(rememberMe));

      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = resolveApiErrorMessage(errorData?.detail, t("login.loginFailed"));
        throw new Error(errorMessage);
      }

      // Auth state now lives in the HttpOnly cookie set by the response.
      // We still consume the body to keep error handling consistent.
      await response.json().catch(() => null);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="w-full">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.018em] text-[#080808]">
            {t("login.subtitle")}
          </h1>
          <p className="mt-2 text-base leading-6 text-[#636363]">{t("login.welcomeBack")}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-[7px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {error}
            </div>
          )}

          <AuthTextField
            id="username"
            label={t("login.username")}
            icon="email"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
            placeholder={t("login.usernamePlaceholder")}
          />

          <AuthTextField
            id="password"
            label={t("login.password")}
            icon="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
          />

          <div className="flex items-center justify-between gap-3 text-sm leading-5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[#636363]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-[#9e9e9e] text-[#3692f6] focus:ring-[#3692f6]"
              />
              <span>{t("login.rememberMe")}</span>
            </label>
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="font-medium text-[#3692f6] transition hover:text-[#106faa] hover:underline"
            >
              {t("login.forgotPassword")}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-[7px] bg-[#3692f6] px-8 text-[1.0625rem] font-medium text-white transition hover:bg-[#197fe5] focus:outline-none focus:ring-2 focus:ring-[#3692f6]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("login.buttonLoading") : t("login.button")}
          </button>
        </form>

        {isGoogleLoginEnabled && (
          <div className="mt-3">
            <GoogleLoginButton
              variant="signin"
              rememberMe={rememberMe}
              width={480}
              onSuccess={(opts) => {
                if (opts.needsProfileCompletion) {
                  setCompleteProfileUsername(opts.username ?? "");
                  setShowCompleteProfile(true);
                } else {
                  router.push("/dashboard");
                }
              }}
              onError={(code) => setError(t(`auth.${code}`))}
              disabled={loading}
            />
          </div>
        )}

        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm leading-5 text-[#818181]">
          <span>{t("login.noAccount")}</span>
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-[#3692f6] transition hover:text-[#106faa] hover:underline"
          >
            {t("login.registerLink")}
          </button>
        </p>

        <CompleteProfileDialog
          open={showCompleteProfile}
          initialUsername={completeProfileUsername}
          onClose={() => setShowCompleteProfile(false)}
          onSuccess={() => {
            setShowCompleteProfile(false);
            router.push("/dashboard");
          }}
        />
      </div>
    </AuthPageShell>
  );
}
