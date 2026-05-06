"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";
import { defaultLocale } from "@/i18n-config";

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
 * 负责 token 验证和用户信息获取（含 email）
 */
export function useAuth() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || defaultLocale;
  /** 与当前路由语言一致，避免跳转到 `/` 后被中间件/Cookie 带到另一种语言的落地页 */
  const landingPath = `/${locale}`;
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
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push(landingPath);
      return;
    }
    return fetch(getApiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
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
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_expires_in");
        router.push(landingPath);
      });
  };

  useEffect(() => {
    fetchUser();
  }, [locale, router]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_expires_in");
    router.push(landingPath);
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

