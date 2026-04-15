"use client";

import { GoogleLogin } from "@react-oauth/google";
import { getApiUrl } from "@/lib/api-config";

export type GoogleButtonVariant = "signin" | "signup";

export type GoogleSuccessOptions = {
  /** 是否需要补全资料（无出生日期时为 true） */
  needsProfileCompletion: boolean;
  /** 当前用户名，补全资料时预填 */
  username?: string;
};

type GoogleLoginButtonProps = {
  variant: GoogleButtonVariant;
  onSuccess: (opts: GoogleSuccessOptions) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

/**
 * 使用 Google 登录/注册按钮。成功后调用 onSuccess，失败调用 onError。
 * 需在 GoogleOAuthProvider 内使用；未配置 Client ID 时不渲染。
 */
export default function GoogleLoginButton({
  variant,
  onSuccess,
  onError,
  disabled,
}: GoogleLoginButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const handleCredential = async (credential: string) => {
    try {
      const res = await fetch(getApiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credential }),
      });
      if (!res.ok) {
        const data = await res.json();
        const code = data.detail || "AUTH_GOOGLE_TOKEN_INVALID";
        onError(code.match(/^[A-Z_]+$/) ? code : "AUTH_GOOGLE_TOKEN_INVALID");
        return;
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_expires_in", String(data.expires_in ?? 0));
      // 请求 /me 判断是否需要补全资料（出生日期）
      try {
        const meRes = await fetch(getApiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.date_of_birth == null) {
            onSuccess({ needsProfileCompletion: true, username: me.username });
            return;
          }
        }
      } catch {
        // 忽略，直接进入首页
      }
      onSuccess({ needsProfileCompletion: false });
    } catch {
      onError("AUTH_GOOGLE_TOKEN_INVALID");
    }
  };

  return (
    <div
      className={`flex items-center justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-hidden={!!disabled}
    >
      <GoogleLogin
        onSuccess={(res) => {
          if (res.credential) handleCredential(res.credential);
          else onError("AUTH_GOOGLE_TOKEN_INVALID");
        }}
        onError={() => onError("AUTH_GOOGLE_TOKEN_INVALID")}
        theme="outline"
        size="large"
        text={variant === "signup" ? "signup_with" : "signin_with"}
        type="standard"
        shape="pill"
        logo_alignment="left"
        width="200"
        containerProps={{
          style: { display: "flex", justifyContent: "center" },
          "aria-disabled": disabled,
        }}
      />
    </div>
  );
}
