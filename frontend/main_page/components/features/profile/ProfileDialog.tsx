"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** 邮箱可选，当前接口可能不返回 */
  email?: string;
  onLogout: () => void;
}

/**
 * 个人资料弹窗：头像点击后在页面正中展示，含语言切换与登出
 */
export default function ProfileDialog({ open, onClose, username, email, onLogout }: ProfileDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");

  const currentLocale = (params?.locale as string) ?? "en";
  const switchLanguage = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const handleLogout = () => {
    onClose();
    onLogout();
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
