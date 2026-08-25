"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api-config";
import { defaultLocale, type Locale } from "@/i18n-config";
import { useRouter } from "@/lib/i18n-navigation";

/** 当前用户信息（来自 GET /api/auth/me） */
export interface AuthUserInfo {
  username: string;
  email?: string;
  date_of_birth?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

/**
 * 认证相关的 Hook
 * 负责通过 HttpOnly cookie 校验登录态并拉取用户信息
 */
export function useAuth() {
  const router = useRouter();
  const params = useParams();
  const locale = ((params.locale as string) || defaultLocale) as Locale;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  /** 未填写出生日期时必须先补全才能使用（含已有老用户） */
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  const fetchUser = () => {
    return apiFetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Token 无效");
      })
      .then((data: AuthUserInfo) => {
        setUsername(data.username || "");
        setEmail(data.email);
        const dob = data.date_of_birth ?? null;
        const userCountry = data.country ?? null;
        const avatar = data.avatar_url ?? null;
        setDateOfBirth(dob);
        setCountry(userCountry);
        setAvatarUrl(avatar);
        setNeedsProfileCompletion(dob == null || dob === undefined);
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch(() => {
        router.push("/", { locale });
      });
  };

  useEffect(() => {
    fetchUser();
  }, [locale, router]);

  const logout = async () => {
    const response = await apiFetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      throw new Error("logout_failed");
    }
  };

  return {
    username,
    email,
    dateOfBirth,
    country,
    avatarUrl,
    loading,
    isAuthenticated,
    /** 未填出生日期时为 true，需弹窗补全后再使用 */
    needsProfileCompletion,
    /** 重新拉取用户信息（补全资料成功后调用） */
    refetch: fetchUser,
    logout,
  };
}

