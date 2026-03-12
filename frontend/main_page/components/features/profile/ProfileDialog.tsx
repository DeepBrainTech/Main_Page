"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getApiUrl } from "@/lib/api-config";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** 邮箱可选，当前接口可能不返回 */
  email?: string;
  onLogout: () => void;
  /** 资料更新后回调（如刷新 useAuth），用于用户名修改后同步展示 */
  onProfileUpdate?: () => void;
}

/**
 * 个人资料弹窗：头像点击后展示，支持修改用户名、语言切换与登出
 */
export default function ProfileDialog({ open, onClose, username, email, onLogout, onProfileUpdate }: ProfileDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");

  const [editingUsername, setEditingUsername] = useState(false);
  const [editValue, setEditValue] = useState(username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (open) {
      setEditValue(username);
      setEditingUsername(false);
      setError("");
      setSuccessMessage("");
    }
  }, [open, username]);

  const currentLocale = (params?.locale as string) ?? "en";
  const switchLanguage = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const handleLogout = () => {
    onClose();
    onLogout();
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
            <dt className="text-gray-500">{tProfile("username")}</dt>
            {editingUsername ? (
              <dd className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  minLength={3}
                  maxLength={50}
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#5E81AC] dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
                  placeholder={tProfile("usernamePlaceholder")}
                  autoFocus
                />
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
