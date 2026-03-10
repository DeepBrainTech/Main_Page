"use client";

import { useTranslations } from "next-intl";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** 邮箱可选，当前接口可能不返回 */
  email?: string;
}

/**
 * 个人资料弹窗：右上角头像点击后展示
 */
export default function ProfileDialog({ open, onClose, username, email }: ProfileDialogProps) {
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed right-4 top-16 z-50 w-72 rounded-xl bg-white p-4 shadow-xl"
        role="dialog"
        aria-label={tProfile("title")}
      >
        <h3 className="mb-3 text-lg font-semibold text-gray-800">{tProfile("title")}</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">{tProfile("username")}</dt>
            <dd className="font-medium text-gray-900">{username || "—"}</dd>
          </div>
          {email !== undefined && (
            <div>
              <dt className="text-gray-500">{tProfile("email")}</dt>
              <dd className="font-medium text-gray-900">{email || "—"}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200"
          >
            {tCommon("confirm")}
          </button>
        </div>
      </div>
    </>
  );
}
