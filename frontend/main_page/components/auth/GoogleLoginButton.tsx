"use client";

import { GoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-config";

export type GoogleButtonVariant = "signin" | "signup";

export type GoogleSuccessOptions = {
  /** Whether profile completion is required when the date of birth is missing. */
  needsProfileCompletion: boolean;
  /** Current username used to prefill the profile dialog. */
  username?: string;
};

type GoogleLoginButtonProps = {
  variant: GoogleButtonVariant;
  rememberMe?: boolean;
  onSuccess: (opts: GoogleSuccessOptions) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  width?: number;
};

/** Google Identity button scaled to the 48px-high Figma control. */
export default function GoogleLoginButton({
  variant,
  rememberMe,
  onSuccess,
  onError,
  disabled,
  width = 480,
}: GoogleLoginButtonProps) {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(width);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => setAvailableWidth(Math.min(width, container.clientWidth));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  if (!clientId) return null;

  const googleButtonScale = 1.2;
  const googleButtonWidth = Math.max(120, Math.floor(availableWidth / googleButtonScale));

  const handleCredential = async (credential: string) => {
    try {
      const res = await apiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: credential,
          ...(rememberMe === undefined ? {} : { remember_me: rememberMe }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const code = data.detail || "AUTH_GOOGLE_TOKEN_INVALID";
        onError(code.match(/^[A-Z_]+$/) ? code : "AUTH_GOOGLE_TOKEN_INVALID");
        return;
      }
      // Cookie is now set; consume body to keep the response stream clean.
      await res.json().catch(() => null);
      try {
        const meRes = await apiFetch("/api/auth/me");
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.date_of_birth == null) {
            onSuccess({ needsProfileCompletion: true, username: me.username });
            return;
          }
        }
      } catch {
        // Ignore profile lookup failures and continue to the dashboard.
      }
      onSuccess({ needsProfileCompletion: false });
    } catch {
      onError("AUTH_GOOGLE_TOKEN_INVALID");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[7px] border-[1.5px] border-[#dfdfdf] bg-white ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-hidden={!!disabled}
    >
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 px-8 text-[1.0625rem] font-medium text-[#818181]">
        <Image src="/auth/google.svg" alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
        <span>{t(variant === "signup" ? "register.signInWithGoogle" : "login.signInWithGoogle")}</span>
      </div>

      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-[0.001]">
        <div
          className="shrink-0"
          style={{
            width: googleButtonWidth,
            transform: `scale(${googleButtonScale})`,
            transformOrigin: "center",
          }}
        >
          <GoogleLogin
            onSuccess={(res) => {
              if (res.credential) handleCredential(res.credential);
              else onError("AUTH_GOOGLE_TOKEN_INVALID");
            }}
            onError={() => onError("AUTH_GOOGLE_TOKEN_INVALID")}
            theme="outline"
            size="large"
            text="signin_with"
            type="standard"
            shape="rectangular"
            logo_alignment="center"
            width={String(googleButtonWidth)}
            containerProps={{
              style: { display: "flex", justifyContent: "center" },
              "aria-disabled": disabled,
            }}
          />
        </div>
      </div>
    </div>
  );
}
