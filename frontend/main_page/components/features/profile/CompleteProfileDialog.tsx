"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";

interface CompleteProfileDialogProps {
  open: boolean;
  initialUsername: string;
  onClose: () => void;
  onSuccess: () => void;
  /** 为 true 时不显示取消按钮、不可点击遮罩关闭，必须填写后提交（如首页强制补全） */
  required?: boolean;
}

/**
 * Google 登录后补全资料弹窗：用户名 + 出生日期，提交后调用 onSuccess（如跳转 home）
 */
export default function CompleteProfileDialog({
  open,
  initialUsername,
  onClose,
  onSuccess,
  required = false,
}: CompleteProfileDialogProps) {
  const t = useTranslations();
  const [username, setUsername] = useState(initialUsername || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(initialUsername || "");
      setDateOfBirth("");
      setError("");
    }
  }, [open, initialUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError(t("completeProfile.usernameInvalid"));
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 50) {
      setError(t("completeProfile.usernameInvalid"));
      return;
    }
    if (!dateOfBirth) {
      setError(t("register.dateOfBirthPlaceholder"));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          date_of_birth: dateOfBirth,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const code = data.detail || "AUTH_USERNAME_EXISTS";
        setError(t(`auth.${code}`));
        return;
      }
      onSuccess();
    } catch {
      setError(t("register.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="complete-profile-title"
      onClick={required ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="complete-profile-title" className="mb-1 text-xl font-semibold text-gray-800 dark:text-white">
          {t("completeProfile.title")}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("completeProfile.subtitle")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="complete-username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("completeProfile.username")}
            </label>
            <input
              id="complete-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-black dark:border-gray-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-white"
              placeholder={t("completeProfile.usernamePlaceholder")}
            />
          </div>
          <div>
            <label htmlFor="complete-dob" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("completeProfile.dateOfBirth")}
            </label>
            <input
              id="complete-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-black dark:border-gray-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-white"
              placeholder={t("completeProfile.dateOfBirthPlaceholder")}
            />
          </div>
          <div className="flex gap-2 pt-2">
            {!required && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={required ? "w-full rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200" : "flex-1 rounded-lg bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"}
            >
              {loading ? t("completeProfile.submitLoading") : t("completeProfile.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
