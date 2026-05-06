"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";
import { getCountryLabel } from "@/constants/countries";
import CountrySelect from "@/components/ui/CountrySelect";

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
 * 个人资料弹窗：头像点击后展示，支持修改用户名、语言切换与登出
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const currentLocale = (params?.locale as string) ?? "en";

  const [editingUsername, setEditingUsername] = useState(false);
  const [editValue, setEditValue] = useState(username);
  const [editingDateOfBirth, setEditingDateOfBirth] = useState(false);
  const [editDateValue, setEditDateValue] = useState(dateOfBirth ?? "");
  const [editingCountry, setEditingCountry] = useState(false);
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
      setEditingUsername(false);
      setEditDateValue(dateOfBirth ?? "");
      setEditingDateOfBirth(false);
      setEditCountryValue((country ?? "").toUpperCase());
      setEditingCountry(false);
      setAvatarFailed(false);
      setError("");
      setSuccessMessage("");
    }
  }, [open, username, dateOfBirth, country, avatarUrl, currentLocale]);

  /** 将 YYYY-MM-DD 格式化为仅月日（不显示年份），用于展示 */
  const formatBirthdayNoYear = (yyyyMmDd: string): string => {
    const parts = yyyyMmDd.trim().split("-");
    if (parts.length !== 3) return yyyyMmDd;
    const [, m, d] = parts;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (Number.isNaN(month) || Number.isNaN(day)) return yyyyMmDd;
    const date = new Date(2000, month - 1, day);
    return date.toLocaleDateString(currentLocale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };
  const switchLanguage = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
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
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError(tProfile("avatarUploadFailed"));
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(getApiUrl("/api/auth/avatar"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  const handleSaveUsername = async () => {
    const val = editValue.trim();
    if (val.length < 3 || val.length > 50) {
      setError(tProfile("usernamePlaceholder"));
      return;
    }
    if (val === username) {
      setEditingUsername(false);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError(tProfile("usernameUpdateFailed"));
        return;
      }
      const res = await fetch(getApiUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: val }),
      });
      if (!res.ok) {
        const data = await res.json();
        const code = data.detail || "AUTH_USERNAME_EXISTS";
        setError(code.match(/^[A-Z_]+$/) ? String(tAuth(code)) : (data.detail || tProfile("usernameUpdateFailed")));
        return;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_expires_in", String(data.expires_in ?? 0));
      }
      setSuccessMessage(tProfile("usernameUpdated"));
      setEditingUsername(false);
      onProfileUpdate?.();
    } catch {
      setError(tProfile("usernameUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDateOfBirth = async () => {
    const val = editDateValue.trim();
    if (!val) {
      setError(tProfile("dateOfBirthPlaceholder"));
      return;
    }
    if (val === (dateOfBirth ?? "")) {
      setEditingDateOfBirth(false);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError(tProfile("dateOfBirthUpdateFailed"));
        return;
      }
      const res = await fetch(getApiUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date_of_birth: val }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || tProfile("dateOfBirthUpdateFailed"));
        return;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_expires_in", String(data.expires_in ?? 0));
      }
      setSuccessMessage(tProfile("dateOfBirthUpdated"));
      setEditingDateOfBirth(false);
      onProfileUpdate?.();
    } catch {
      setError(tProfile("dateOfBirthUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCountry = async () => {
    const val = editCountryValue.trim().toUpperCase();
    if (val === (country ?? "")) {
      setEditingCountry(false);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError(tProfile("countryUpdateFailed"));
        return;
      }
      const res = await fetch(getApiUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country: val || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || tProfile("countryUpdateFailed"));
        return;
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_expires_in", String(data.expires_in ?? 0));
      }
      setSuccessMessage(tProfile("countryUpdated"));
      setEditingCountry(false);
      onProfileUpdate?.();
    } catch {
      setError(tProfile("countryUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4"
        aria-hidden
        onClick={onClose}
      >
        <div
          className="w-72 rounded-xl bg-white p-4 shadow-xl"
          role="dialog"
          aria-label={tProfile("title")}
          onClick={(e) => e.stopPropagation()}
        >
        <h3 className="mb-3 text-lg font-semibold text-gray-800">{tProfile("title")}</h3>
        {error && (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {successMessage}
          </div>
        )}
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">{tProfile("avatar")}</dt>
            <dd className="mt-1 flex items-center justify-between gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200">
                <img
                  src={resolvedAvatarSrc}
                  alt={tProfile("avatar")}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              </div>
              <div className="flex items-center gap-2">
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
                  className="rounded bg-[#5E81AC] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#4a6a8a] disabled:opacity-50"
                >
                  {uploadingAvatar ? "..." : tProfile("changeAvatar")}
                </button>
              </div>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{tProfile("username")}</dt>
            {editingUsername ? (
              <dd className="mt-1 space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  minLength={3}
                  maxLength={50}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#5E81AC] dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
                  placeholder={tProfile("usernamePlaceholder")}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    disabled={saving}
                    className="rounded bg-[#5E81AC] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#4a6a8a] disabled:opacity-50"
                  >
                    {saving ? "..." : tProfile("saveUsername")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingUsername(false); setEditValue(username); setError(""); }}
                    className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-700"
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              </dd>
            ) : (
              <dd className="flex items-center justify-between font-medium text-gray-900">
                <span>{username || "—"}</span>
                <button
                  type="button"
                  onClick={() => setEditingUsername(true)}
                  className="text-xs text-[#5E81AC] hover:underline"
                >
                  {tProfile("editUsername")}
                </button>
              </dd>
            )}
          </div>
          {email !== undefined && (
            <div>
              <dt className="text-gray-500">{tProfile("email")}</dt>
              <dd className="font-medium text-gray-900">{email || "—"}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">{tProfile("dateOfBirth")}</dt>
            {editingDateOfBirth ? (
              <dd className="mt-1 flex items-center gap-2">
                <input
                  type="date"
                  value={editDateValue}
                  onChange={(e) => setEditDateValue(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#5E81AC] dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
                  aria-label={tProfile("dateOfBirthPlaceholder")}
                />
                <button
                  type="button"
                  onClick={handleSaveDateOfBirth}
                  disabled={saving}
                  className="rounded bg-[#5E81AC] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#4a6a8a] disabled:opacity-50"
                >
                  {saving ? "..." : tProfile("saveUsername")}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingDateOfBirth(false); setEditDateValue(dateOfBirth ?? ""); setError(""); }}
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-700"
                >
                  {tCommon("cancel")}
                </button>
              </dd>
            ) : (
              <dd className="flex items-center justify-between font-medium text-gray-900">
                <span>{(dateOfBirth && dateOfBirth.trim()) ? formatBirthdayNoYear(dateOfBirth) : "—"}</span>
                <button
                  type="button"
                  onClick={() => setEditingDateOfBirth(true)}
                  className="text-xs text-[#5E81AC] hover:underline"
                >
                  {tProfile("editDateOfBirth")}
                </button>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-gray-500">{tProfile("country")}</dt>
            {editingCountry ? (
              <dd className="mt-1 flex items-center gap-2">
                <CountrySelect
                  value={editCountryValue}
                  onChange={setEditCountryValue}
                  locale={currentLocale}
                  placeholder={tProfile("countryPlaceholder")}
                  className="h-8 flex-1 rounded border border-gray-300 px-2 py-1.5 text-left text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#5E81AC] dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveCountry}
                  disabled={saving}
                  className="rounded bg-[#5E81AC] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#4a6a8a] disabled:opacity-50"
                >
                  {saving ? "..." : tProfile("saveUsername")}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingCountry(false); setEditCountryValue((country ?? "").toUpperCase()); setError(""); }}
                  className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-700"
                >
                  {tCommon("cancel")}
                </button>
              </dd>
            ) : (
              <dd className="flex items-center justify-between font-medium text-gray-900">
                <span>{(country && country.trim()) ? getCountryLabel(country, currentLocale) : "—"}</span>
                <button
                  type="button"
                  onClick={() => setEditingCountry(true)}
                  className="text-xs text-[#5E81AC] hover:underline"
                >
                  {tProfile("editCountry")}
                </button>
              </dd>
            )}
          </div>
        </dl>

        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div>
            <span className="mb-1.5 block text-xs text-gray-500">{tCommon("language")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchLanguage("zh")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentLocale === "zh"
                    ? "bg-[#5E81AC] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tCommon("localeZh")}
              </button>
              <button
                type="button"
                onClick={() => switchLanguage("en")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentLocale === "en"
                    ? "bg-[#5E81AC] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tCommon("localeEn")}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
            >
              {tCommon("confirm")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {tCommon("logout")}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
