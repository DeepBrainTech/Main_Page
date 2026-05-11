"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import CountrySelect from "@/components/ui/CountrySelect";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import CompleteProfileDialog from "@/components/features/profile/CompleteProfileDialog";

type FormField =
  | "username"
  | "country"
  | "email"
  | "verificationCode"
  | "password"
  | "confirmPassword"
  | "dateOfBirth"
  | "agreeTerms";

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  const [formData, setFormData] = useState({
    username: "",
    country: "",
    email: "",
    verificationCode: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });
  /** 无对应表单字段时的提示（如 Google 失败、网络错误），不使用顶部大红条 */
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [completeProfileUsername, setCompleteProfileUsername] = useState("");
  const isGoogleLoginEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const usernameRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLButtonElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const verificationCodeRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const agreeTermsRef = useRef<HTMLInputElement>(null);

  const focusField = (field: FormField) => {
    let target: HTMLInputElement | HTMLButtonElement | null = null;
    if (field === "username") target = usernameRef.current;
    if (field === "country") target = countryRef.current;
    if (field === "dateOfBirth") target = dateOfBirthRef.current;
    if (field === "email") target = emailRef.current;
    if (field === "verificationCode") target = verificationCodeRef.current;
    if (field === "password") target = passwordRef.current;
    if (field === "confirmPassword") target = confirmPasswordRef.current;
    if (field === "agreeTerms") target = agreeTermsRef.current;

    if (!target) return;
    target.focus();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const raiseFieldError = (field: FormField, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    setGeneralError("");
    focusField(field);
  };

  const clearFieldError = (field: FormField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const mapApiField = (value: string): FormField | undefined => {
    if (value === "username") return "username";
    if (value === "email") return "email";
    if (value === "verification_code") return "verificationCode";
    if (value === "password") return "password";
    if (value === "date_of_birth") return "dateOfBirth";
    if (value === "country") return "country";
    return undefined;
  };

  const friendlyValidationMessage = (
    locField: FormField | undefined,
    rawMsg: string,
    fallback: string
  ): { message: string; field?: FormField } => {
    const low = rawMsg.toLowerCase();
    const looksLikeEmail =
      locField === "email" ||
      (low.includes("email") && (low.includes("valid") || low.includes("@")));
    if (looksLikeEmail) {
      return { message: t("register.emailInvalid"), field: locField ?? "email" };
    }
    if (locField === "username" || low.includes("username")) {
      return { message: t("auth.AUTH_USERNAME_INVALID"), field: locField ?? "username" };
    }
    if (locField === "password" || (low.includes("password") && low.includes("least"))) {
      return { message: t("register.passwordTooShort"), field: locField ?? "password" };
    }
    if (locField === "verificationCode") {
      return { message: t("register.verificationCodeInvalid"), field: "verificationCode" };
    }
    if (locField === "dateOfBirth" || low.includes("date")) {
      return { message: t("register.dateInvalid"), field: locField ?? "dateOfBirth" };
    }
    return { message: fallback, field: locField };
  };

  const parseApiError = (detail: unknown, fallback: string): { message: string; field?: FormField } => {
    if (typeof detail === "string") {
      const codeFieldMap: Partial<Record<string, FormField>> = {
        AUTH_USERNAME_EXISTS: "username",
        AUTH_USERNAME_INVALID: "username",
        AUTH_EMAIL_EXISTS: "email",
        EMAIL_NOT_FOUND: "email",
        VERIFICATION_CODE_INVALID: "verificationCode",
      };
      if (/^[A-Z_]+$/.test(detail)) {
        return { message: t(`auth.${detail}`), field: codeFieldMap[detail] };
      }
      return friendlyValidationMessage(undefined, detail, fallback);
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "string") {
        return friendlyValidationMessage(undefined, first, fallback);
      }
      if (first && typeof first === "object") {
        const item = first as { msg?: unknown; loc?: unknown };
        const rawMsg = typeof item.msg === "string" && item.msg.trim() ? item.msg : "";
        const locField =
          Array.isArray(item.loc) && typeof item.loc[item.loc.length - 1] === "string"
            ? mapApiField(item.loc[item.loc.length - 1] as string)
            : undefined;
        if (!rawMsg) {
          return { message: fallback, field: locField };
        }
        return friendlyValidationMessage(locField, rawMsg, fallback);
      }
    }

    if (detail && typeof detail === "object" && "message" in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return friendlyValidationMessage(undefined, message, fallback);
      }
    }

    return { message: fallback };
  };

  const inputClassName = (field: FormField) =>
    `h-12 w-full rounded-2xl border-2 bg-white px-4 text-sm text-slate-900 outline-none transition ${
      fieldErrors[field]
        ? "border-rose-400 ring-2 ring-rose-100"
        : "border-slate-200 focus:border-blue-500"
    }`;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as FormField;
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    clearFieldError(field);
    setGeneralError("");
  };

  const handleSendCode = async () => {
    setGeneralError("");
    setSuccessMessage("");

    const email = formData.email.trim();
    setFormData((prev) => ({ ...prev, email }));

    if (!email) {
      raiseFieldError("email", t("register.emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      raiseFieldError("email", t("register.emailInvalid"));
      return;
    }

    clearFieldError("email");
    setSendingCode(true);

    try {
      const response = await apiFetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          language: locale === "zh" ? "zh" : "en",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const parsed = parseApiError(errorData?.detail, t("register.registerFailed"));
        if (parsed.field) {
          raiseFieldError(parsed.field, parsed.message);
        } else {
          setGeneralError(parsed.message);
        }
        return;
      }

      setSuccessMessage(t("register.verificationCodeSent"));
      setCountdown(60);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("register.registerFailed");
      setGeneralError(errorMessage);
    } finally {
      setSendingCode(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    const username = formData.username.trim();
    const country = formData.country.trim();
    const email = formData.email.trim();
    const verificationCode = formData.verificationCode.trim();
    setFormData((prev) => ({ ...prev, username, country, email, verificationCode }));

    if (formData.password !== formData.confirmPassword) {
      raiseFieldError("confirmPassword", t("register.passwordMismatch"));
      return;
    }

    if (formData.password.length < 6) {
      raiseFieldError("password", t("register.passwordTooShort"));
      return;
    }

    if (!agreedToTerms) {
      raiseFieldError("agreeTerms", t("register.agreeTermsRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password: formData.password,
          verification_code: verificationCode,
          date_of_birth: formData.dateOfBirth || null,
          country: country || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const parsed = parseApiError(errorData?.detail, t("register.registerFailed"));
        if (parsed.field) {
          raiseFieldError(parsed.field, parsed.message);
        } else {
          setGeneralError(parsed.message);
        }
        return;
      }

      // Cookie was set by the response; we only branch on whether the API auto-logged us in.
      const result = await response.json();

      if (result?.data?.access_token) {
        router.push(`/${locale}/dashboard`);
      } else {
        router.push(`/${locale}/login?registered=true`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("register.registerFailed");
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-white px-4 py-10">
      <div className="pointer-events-none absolute -left-16 bottom-4 h-56 w-56 rounded-full bg-gradient-to-br from-sky-200 to-blue-300 opacity-45 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-0 h-52 w-52 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 opacity-50 blur-3xl" />

      <main className="relative w-full max-w-[440px] overflow-hidden rounded-[30px] border border-white/50 bg-white/95 p-7 shadow-[0_30px_60px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:p-9">
        <div className="mb-7 text-center">
          <h1 className="text-4xl font-bold tracking-wide text-[#2B7FFF]">{t("register.heading")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("register.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              {t("register.username")}
            </label>
            <input
              ref={usernameRef}
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              placeholder={t("register.usernamePlaceholder")}
              className={inputClassName("username")}
            />
            {fieldErrors.username && <p className="text-xs text-rose-600">{fieldErrors.username}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700">
              {t("register.dateOfBirth")}
            </label>
            <input
              ref={dateOfBirthRef}
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={inputClassName("dateOfBirth")}
            />
            {fieldErrors.dateOfBirth && <p className="text-xs text-rose-600">{fieldErrors.dateOfBirth}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="country" className="block text-sm font-medium text-slate-700">
              {t("register.country")}
            </label>
            <CountrySelect
              value={formData.country}
              onChange={(code) => {
                setFormData({ ...formData, country: code });
                clearFieldError("country");
                setGeneralError("");
              }}
              locale={locale}
              placeholder={t("register.countryPlaceholder")}
              className={inputClassName("country")}
              buttonRef={countryRef}
            />
            {fieldErrors.country && <p className="text-xs text-rose-600">{fieldErrors.country}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              {t("register.email")}
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder={t("register.emailPlaceholder")}
              className={inputClassName("email")}
            />
            {fieldErrors.email && <p className="text-xs text-rose-600">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="verificationCode" className="block text-sm font-medium text-slate-700">
              {t("register.verificationCode")}
            </label>
            <div className="flex gap-2">
              <input
                ref={verificationCodeRef}
                id="verificationCode"
                name="verificationCode"
                type="text"
                value={formData.verificationCode}
                onChange={handleChange}
                required
                maxLength={6}
                autoComplete="off"
                placeholder={t("register.verificationCodePlaceholder")}
                className={`h-12 flex-1 rounded-2xl border-2 bg-white px-4 text-sm text-slate-900 outline-none transition ${
                  fieldErrors.verificationCode
                    ? "border-rose-400 ring-2 ring-rose-100"
                    : "border-slate-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className="h-12 shrink-0 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingCode
                  ? t("register.sendingCode")
                  : countdown > 0
                  ? t("register.resendCode", { seconds: countdown })
                  : t("register.sendCode")}
              </button>
            </div>
            {fieldErrors.verificationCode && (
              <p className="text-xs text-rose-600">{fieldErrors.verificationCode}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              {t("register.password")}
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder={t("register.passwordPlaceholder")}
              className={inputClassName("password")}
            />
            {fieldErrors.password && <p className="text-xs text-rose-600">{fieldErrors.password}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              {t("register.confirmPassword")}
            </label>
            <input
              ref={confirmPasswordRef}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder={t("register.confirmPasswordPlaceholder")}
              className={inputClassName("confirmPassword")}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-rose-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div
            className={`flex items-start gap-2 rounded-lg pt-1 text-xs leading-5 ${
              fieldErrors.agreeTerms ? "text-rose-600" : "text-slate-500"
            }`}
          >
            <input
              ref={agreeTermsRef}
              id="agreeTerms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                clearFieldError("agreeTerms");
                setGeneralError("");
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="agreeTerms">
              <span>I agree to the </span>
              <span className="font-medium text-blue-600">Terms of Service</span>
              <span> and </span>
              <span className="font-medium text-blue-600">Privacy Policy</span>
            </label>
          </div>
          {fieldErrors.agreeTerms && <p className="text-xs text-rose-600">{fieldErrors.agreeTerms}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.55)] transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("register.buttonLoading") : t("register.button")}
          </button>

          {generalError && (
            <p className="text-center text-sm text-rose-600" role="alert">
              {generalError}
            </p>
          )}
        </form>

        {isGoogleLoginEnabled && (
          <>
            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-400">{t("register.orContinueWith")}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center">
            <GoogleLoginButton
              variant="signup"
              onSuccess={(opts) => {
                if (opts.needsProfileCompletion) {
                  setCompleteProfileUsername(opts.username ?? "");
                  setShowCompleteProfile(true);
                } else {
                  router.push(`/${locale}/dashboard`);
                }
              }}
              onError={(code) => {
                setGeneralError(t(`auth.${code}`));
                setFieldErrors({});
              }}
              disabled={loading}
            />
            </div>
          </>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          <span>{t("register.hasAccount")} </span>
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="font-semibold text-blue-600 hover:underline"
          >
            {t("register.loginLink")}
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
            router.push(`/${locale}/dashboard`);
          }}
        />
      </main>
    </div>
  );
}
