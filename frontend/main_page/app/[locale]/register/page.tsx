"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/lib/i18n-navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import CountrySelect from "@/components/ui/CountrySelect";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import AuthPageShell from "@/components/auth/AuthPageShell";
import AuthTextField from "@/components/auth/AuthTextField";
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
  const usernameAvailabilityRequestRef = useRef(0);
  const emailAvailabilityRequestRef = useRef(0);

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

  const controlClassName = (field: FormField, hasLeadingIcon = false) =>
    `h-12 w-full rounded-[5px] border bg-white py-3 text-base leading-6 text-[#080808] outline-none transition placeholder:text-[#818181] ${
      hasLeadingIcon ? "pl-[3.25rem] pr-4" : "px-4"
    } ${
      fieldErrors[field]
        ? "border-rose-400 ring-2 ring-rose-100"
        : "border-[#9e9e9e] focus:border-[#3692f6] focus:ring-2 focus:ring-[#3692f6]/15"
    }`;

  useEffect(() => {
    const username = formData.username.trim();
    const requestId = usernameAvailabilityRequestRef.current + 1;
    usernameAvailabilityRequestRef.current = requestId;

    if (!username || username.length < 3 || username.length > 50) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch(
          `/api/auth/check-availability?username=${encodeURIComponent(username)}`
        );
        if (!response.ok || usernameAvailabilityRequestRef.current !== requestId) return;

        const result = await response.json();
        if (usernameAvailabilityRequestRef.current !== requestId) return;

        if (result?.data?.username_available === false) {
          setFieldErrors((prev) => ({ ...prev, username: t("auth.AUTH_USERNAME_EXISTS") }));
        } else {
          setFieldErrors((prev) => {
            if (prev.username !== t("auth.AUTH_USERNAME_EXISTS")) return prev;
            const next = { ...prev };
            delete next.username;
            return next;
          });
        }
      } catch {
        // Availability checks are advisory; registration still performs the authoritative check.
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formData.username, t]);

  useEffect(() => {
    const email = formData.email.trim();
    const requestId = emailAvailabilityRequestRef.current + 1;
    emailAvailabilityRequestRef.current = requestId;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch(
          `/api/auth/check-availability?email=${encodeURIComponent(email)}`
        );
        if (!response.ok || emailAvailabilityRequestRef.current !== requestId) return;

        const result = await response.json();
        if (emailAvailabilityRequestRef.current !== requestId) return;

        if (result?.data?.email_available === false) {
          setFieldErrors((prev) => ({ ...prev, email: t("auth.AUTH_EMAIL_EXISTS") }));
        } else {
          setFieldErrors((prev) => {
            if (prev.email !== t("auth.AUTH_EMAIL_EXISTS")) return prev;
            const next = { ...prev };
            delete next.email;
            return next;
          });
        }
      } catch {
        // Availability checks are advisory; registration still performs the authoritative check.
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formData.email, t]);

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

    if (!formData.dateOfBirth) {
      raiseFieldError("dateOfBirth", t("register.dateOfBirthRequired"));
      return;
    }

    if (!country) {
      raiseFieldError("country", t("register.countryRequired"));
      return;
    }

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

      // Cookie was set by the response; branch on the auto_login signal.
      const result = await response.json().catch(() => null);

      if (result?.data?.auto_login) {
        router.push("/dashboard");
      } else {
        router.push("/login?registered=true");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("register.registerFailed");
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell contentClassName="items-start py-10 lg:py-16">
      <div className="w-full">
        <header className="mb-7 text-center">
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.018em] text-[#080808]">
            {t("register.heading")}
          </h1>
          <p className="mt-2 text-base leading-6 text-[#636363]">{t("register.subtitle")}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div className="rounded-[7px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              {successMessage}
            </div>
          )}

          <AuthTextField
            inputRef={usernameRef}
            id="username"
            name="username"
            label={t("register.username")}
            icon="email"
            value={formData.username}
            onChange={handleChange}
            error={fieldErrors.username}
            required
            minLength={3}
            maxLength={50}
            autoComplete="username"
            placeholder={t("register.usernamePlaceholder")}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <AuthTextField
              inputRef={dateOfBirthRef}
              id="dateOfBirth"
              name="dateOfBirth"
              label={t("register.dateOfBirth")}
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              error={fieldErrors.dateOfBirth}
              required
            />

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="country" className="block text-sm font-medium leading-none text-[#123a64]">
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
                className={`${controlClassName("country")} flex items-center text-left`}
                dropdownClassName="right-0 sm:left-0"
                buttonRef={countryRef}
              />
              {fieldErrors.country && (
                <p className="text-xs leading-4 text-rose-600" role="alert">
                  {fieldErrors.country}
                </p>
              )}
            </div>
          </div>

          <AuthTextField
            inputRef={emailRef}
            id="email"
            name="email"
            label={t("register.email")}
            icon="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
            autoComplete="email"
            placeholder={t("register.emailPlaceholder")}
          />

          <div className="space-y-1.5">
            <label htmlFor="verificationCode" className="block text-sm font-medium leading-none text-[#123a64]">
              {t("register.verificationCode")}
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Image
                  src="/auth/email.svg"
                  alt=""
                  width={24}
                  height={24}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2"
                />
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
                  aria-invalid={Boolean(fieldErrors.verificationCode)}
                  aria-describedby={fieldErrors.verificationCode ? "verificationCode-error" : undefined}
                  placeholder={t("register.verificationCodePlaceholder")}
                  className={controlClassName("verificationCode", true)}
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className="h-12 shrink-0 rounded-[7px] border border-[#dfdfdf] bg-white px-4 text-sm font-medium text-[#3692f6] transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-[#3692f6]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingCode
                  ? t("register.sendingCode")
                  : countdown > 0
                  ? t("register.resendCode", { seconds: countdown })
                  : t("register.sendCode")}
              </button>
            </div>
            {fieldErrors.verificationCode && (
              <p id="verificationCode-error" className="text-xs leading-4 text-rose-600" role="alert">
                {fieldErrors.verificationCode}
              </p>
            )}
          </div>

          <AuthTextField
            inputRef={passwordRef}
            id="password"
            name="password"
            label={t("register.password")}
            icon="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
          />

          <AuthTextField
            inputRef={confirmPasswordRef}
            id="confirmPassword"
            name="confirmPassword"
            label={t("register.confirmPassword")}
            icon="password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={t("register.confirmPasswordPlaceholder")}
          />

          <div className={`flex items-start gap-2 pt-1 text-xs leading-5 ${fieldErrors.agreeTerms ? "text-rose-600" : "text-[#636363]"}`}>
            <input
              ref={agreeTermsRef}
              id="agreeTerms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => {
                setAgreedToTerms(event.target.checked);
                clearFieldError("agreeTerms");
                setGeneralError("");
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#9e9e9e] text-[#3692f6] focus:ring-[#3692f6]"
            />
            <label htmlFor="agreeTerms">
              <span>{t("register.termsAgreementPrefix")} </span>
              <span className="font-medium text-[#3692f6]">{t("register.termsOfService")}</span>
              <span> {t("register.termsAgreementAnd")} </span>
              <Link
                href="/privacy-policy"
                className="font-medium text-[#3692f6] underline-offset-2 hover:underline"
              >
                {t("register.privacyPolicy")}
              </Link>
              <span>{t("register.termsAgreementSuffix")}</span>
            </label>
          </div>
          {fieldErrors.agreeTerms && (
            <p className="text-xs leading-4 text-rose-600" role="alert">
              {fieldErrors.agreeTerms}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-[7px] bg-[#3692f6] px-8 text-[1.0625rem] font-medium text-white transition hover:bg-[#197fe5] focus:outline-none focus:ring-2 focus:ring-[#3692f6]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mt-3">
            <GoogleLoginButton
              variant="signup"
              width={480}
              onSuccess={(opts) => {
                if (opts.needsProfileCompletion) {
                  setCompleteProfileUsername(opts.username ?? "");
                  setShowCompleteProfile(true);
                } else {
                  router.push("/dashboard");
                }
              }}
              onError={(code) => {
                setGeneralError(t(`auth.${code}`));
                setFieldErrors({});
              }}
              disabled={loading}
            />
          </div>
        )}

        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm leading-5 text-[#818181]">
          <span>{t("register.hasAccount")}</span>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-[#3692f6] transition hover:text-[#106faa] hover:underline"
          >
            {t("register.loginLink")}
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
