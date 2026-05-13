"use client";

import { useState, useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";
import { getCountryLabel } from "@/constants/countries";
import CountrySelect from "@/components/ui/CountrySelect";

function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "\u{1F30D}";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "\u{1F30D}";
  const regionalA = 0x1f1e6;
  return String.fromCodePoint(upper.charCodeAt(0) - 65 + regionalA, upper.charCodeAt(1) - 65 + regionalA);
}

function ProfileRowIcon({ flagEmoji, children }: { flagEmoji?: string | null; children?: ReactNode }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_1.16px_2.32px_-1.16px_rgba(0,0,0,0.10),0px_1.16px_3.48px_0px_rgba(0,0,0,0.10)]"
      aria-hidden
    >
      {flagEmoji != null ? (
        <span className="font-app-body text-2xl font-normal leading-none text-zinc-800">{flagEmoji}</span>
      ) : (
        children
      )}
    </div>
  );
}

function IconUser() {
  return (
    <svg className="h-6 w-6 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg className="h-6 w-6 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-6 w-6 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
  );
}

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** 邮箱可选，当前接口可能不返回 */
  email?: string;
  /** 出生日期 YYYY-MM-DD，可选 */
  dateOfBirth?: string | null;
  /** Country is optional */
  country?: string | null;
  /** Current user avatar URL */
  avatarUrl?: string | null;
  onLogout: () => void;
  /** 资料更新后回调（如刷新 useAuth），用于用户名/出生日期修改后同步展示 */
  onProfileUpdate?: () => void;
}

/**
 * Profile dialog: opened from avatar; edit profile fields and logout.
 */
export default function ProfileDialog({
  open,
  onClose,
  username,
  email,
  dateOfBirth,
  country,
  avatarUrl,
  onLogout,
  onProfileUpdate,
}: ProfileDialogProps) {
  const params = useParams();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const currentLocale = (params?.locale as string) ?? "en";

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editValue, setEditValue] = useState(username);
  const [editDateValue, setEditDateValue] = useState(dateOfBirth ?? "");
  const [editCountryValue, setEditCountryValue] = useState((country ?? "").toUpperCase());
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedAvatarSrc = !avatarFailed && avatarUrl ? avatarUrl : "/dashboard/default.png";

  useEffect(() => {
    if (open) {
      setEditValue(username);
      setEditDateValue(dateOfBirth ?? "");
      setEditCountryValue((country ?? "").toUpperCase());
      setIsEditingProfile(false);
      setAvatarFailed(false);
      setError("");
      setSuccessMessage("");
    }
  }, [open, username, dateOfBirth, country, avatarUrl, currentLocale]);

  /** Format YYYY-MM-DD for profile view: month and day only (year hidden). */
  const formatBirthdayWithoutYear = (yyyyMmDd: string): string => {
    const parts = yyyyMmDd.trim().split("-");
    if (parts.length !== 3) return yyyyMmDd;
    const [y, m, d] = parts;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(date.getTime())) return yyyyMmDd;
    return date.toLocaleDateString(currentLocale === "zh" ? "zh-CN" : "en-US", {
      month: "long",
      day: "numeric",
    });
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const handleAvatarFileChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccessMessage("");

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(tProfile("avatarUnsupported"));
      evt.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(tProfile("avatarTooLarge"));
      evt.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/auth/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = data.detail || "AUTH_AVATAR_UPLOAD_FAILED";
        if (code === "AUTH_AVATAR_TOO_LARGE") {
          setError(tProfile("avatarTooLarge"));
        } else if (code === "AUTH_AVATAR_UNSUPPORTED") {
          setError(tProfile("avatarUnsupported"));
        } else {
          setError(code.match(/^[A-Z_]+$/) ? String(tAuth(code)) : String(data.detail || tProfile("avatarUploadFailed")));
        }
        return;
      }
      setSuccessMessage(tProfile("avatarUpdated"));
      setAvatarFailed(false);
      onProfileUpdate?.();
    } catch {
      setError(tProfile("avatarUploadFailed"));
    } finally {
      setUploadingAvatar(false);
      evt.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    const usernameVal = editValue.trim();
    const dobVal = editDateValue.trim();
    const countryVal = editCountryValue.trim().toUpperCase();
    const serverCountry = (country ?? "").trim().toUpperCase();

    const body: Record<string, string | null> = {};

    if (usernameVal !== username) {
      if (usernameVal.length < 3 || usernameVal.length > 50) {
        setError(tProfile("usernamePlaceholder"));
        return;
      }
      body.username = usernameVal;
    }

    if (dobVal !== (dateOfBirth ?? "").trim()) {
      if (!dobVal) {
        setError(tProfile("dateOfBirthPlaceholder"));
        return;
      }
      body.date_of_birth = dobVal;
    }

    if (countryVal !== serverCountry) {
      body.country = countryVal || null;
    }

    if (Object.keys(body).length === 0) {
      setError("");
      setIsEditingProfile(false);
      return;
    }

    setError("");
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail;
        const codeStr = typeof detail === "string" ? detail : "";
        if (codeStr.match(/^[A-Z_]+$/)) {
          setError(String(tAuth(codeStr)));
        } else {
          setError(codeStr || tProfile("usernameUpdateFailed"));
        }
        return;
      }
      await res.json().catch(() => null);
      setSuccessMessage(tProfile("profileUpdated"));
      setIsEditingProfile(false);
      onProfileUpdate?.();
    } catch {
      setError(
        "username" in body
          ? tProfile("usernameUpdateFailed")
          : "date_of_birth" in body
            ? tProfile("dateOfBirthUpdateFailed")
            : tProfile("countryUpdateFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const openProfileFieldEditors = () => {
    setEditValue(username);
    setEditDateValue(dateOfBirth ?? "");
    setEditCountryValue((country ?? "").toUpperCase());
    setIsEditingProfile(true);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4 font-app-body"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[454px] min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-[0px_4.64px_27.84px_0px_rgba(4,94,150,0.08)]"
        role="dialog"
        aria-label={tProfile("title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-28 shrink-0 bg-gradient-to-br from-blue-100 via-blue-100 to-indigo-50">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-5 flex h-9 w-9 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-white/60"
            aria-label={tProfile("closeProfile")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:opacity-60"
              aria-label={tProfile("changeAvatar")}
            >
              <div className="relative h-28 w-28 overflow-hidden rounded-full shadow-[0px_4.64px_6.96px_-4.64px_rgba(0,0,0,0.10),0px_11.6px_17.4px_-3.48px_rgba(0,0,0,0.10)] ring-4 ring-white">
                <img
                  src={resolvedAvatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white">
                    …
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/35 to-transparent pb-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-zinc-800 shadow-sm">
                    {tProfile("changeAvatar")}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-16">
          <h2 className="sr-only">{tProfile("title")}</h2>
          <div className="mb-6 flex w-full justify-center">
            <div className="relative inline-flex min-h-8 items-center">
              <span className="inline-block max-w-[min(100%,260px)] truncate text-center text-2xl font-semibold leading-8 text-zinc-800">
                {username || "—"}
              </span>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={openProfileFieldEditors}
                  className="absolute left-full top-1/2 ml-0.5 flex h-9 w-9 shrink-0 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-sky-50"
                  aria-label={tProfile("editProfile")}
                >
                  <img src="/profile/edit.svg" alt="" width={20} height={20} className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {successMessage}
            </div>
          )}

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex min-h-20 items-center gap-3.5 rounded-2xl bg-[#F2FAFF] p-4">
                <ProfileRowIcon>
                  <IconUser />
                </ProfileRowIcon>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-normal leading-5 text-slate-500">{tProfile("username")}</div>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        setError("");
                      }}
                      minLength={3}
                      maxLength={50}
                      className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-base font-medium text-zinc-800 shadow-sm outline-none ring-sky-300 focus:ring-2 dark:border-sky-800 dark:bg-zinc-900 dark:text-white"
                      placeholder={tProfile("usernamePlaceholder")}
                      autoFocus
                    />
                  ) : (
                    <p className="mt-0.5 truncate text-base font-medium leading-6 text-zinc-800">{username || "—"}</p>
                  )}
                </div>
              </div>

              {email !== undefined && (
                <div className="flex min-h-20 items-center gap-3.5 rounded-2xl bg-[#F2FAFF] p-4">
                  <ProfileRowIcon>
                    <IconMail />
                  </ProfileRowIcon>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-normal leading-5 text-slate-500">{tProfile("email")}</div>
                    <p className="mt-0.5 truncate text-base font-medium leading-6 text-zinc-800">{email || "—"}</p>
                  </div>
                </div>
              )}

              <div className="flex min-h-20 items-center gap-3.5 rounded-2xl bg-[#F2FAFF] p-4">
                <ProfileRowIcon flagEmoji={countryCodeToFlagEmoji(isEditingProfile ? editCountryValue : country)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-normal leading-5 text-slate-500">{tProfile("country")}</div>
                  {isEditingProfile ? (
                    <CountrySelect
                      value={editCountryValue}
                      onChange={setEditCountryValue}
                      locale={currentLocale}
                      placeholder={tProfile("countryPlaceholder")}
                      className="mt-1 h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-left text-base text-zinc-800 shadow-sm outline-none ring-sky-300 focus:ring-2 dark:border-sky-800 dark:bg-zinc-900 dark:text-white"
                    />
                  ) : (
                    <p className="mt-0.5 truncate text-base font-medium leading-6 text-zinc-800">
                      {country && country.trim() ? getCountryLabel(country, currentLocale) : "—"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex min-h-20 items-center gap-3.5 rounded-2xl bg-[#F2FAFF] p-4">
                <ProfileRowIcon>
                  <IconCalendar />
                </ProfileRowIcon>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-normal leading-5 text-slate-500">{tProfile("dateOfBirth")}</div>
                  {isEditingProfile ? (
                    <input
                      type="date"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-base text-zinc-800 shadow-sm outline-none ring-sky-300 focus:ring-2 dark:border-sky-800 dark:bg-zinc-900 dark:text-white"
                      aria-label={tProfile("dateOfBirthPlaceholder")}
                    />
                  ) : (
                    <p className="mt-0.5 truncate text-base font-medium leading-6 text-zinc-800">
                      {dateOfBirth && dateOfBirth.trim() ? formatBirthdayWithoutYear(dateOfBirth) : "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex h-14 w-full items-center justify-center rounded-full bg-[#E45C44] text-lg font-semibold leading-7 text-white shadow-[0px_10px_15px_0px_rgba(228,92,68,0.20)] transition-colors hover:bg-[#d14d38] disabled:opacity-50"
              >
                {saving ? "…" : tProfile("saveChanges")}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 self-center text-base font-medium text-stone-500 transition-colors hover:text-stone-700"
            >
              <img src="/profile/logout.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden />
              {tCommon("logout")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
