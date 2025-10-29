"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem("access_token");
    if (token) {
      // 验证 token 是否有效
      fetch("http://localhost:8000/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Token 无效");
        })
        .then((data) => {
          setIsLoggedIn(true);
          setUsername(data.data?.username || "");
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          setIsLoggedIn(false);
        });
    }
  }, []);

  const handleLogin = () => {
    router.push(`/${locale}/login`);
  };

  const handleRegister = () => {
    router.push(`/${locale}/register`);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_expires_in");
    setIsLoggedIn(false);
    setUsername("");
  };

  const handleSudokuBattle = () => {
    // TODO: 跳转到数独对战页面
    // router.push(`/${locale}/sudoku-battle`);
    console.log("Sudoku Battle clicked");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start relative">
        {/* 语言切换器 */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        
        <div className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-5xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50">
            {t("home.title")}
          </h1>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {isLoggedIn ? (
            <>
              <div className="flex flex-col items-center gap-4 sm:items-start">
                <p className="text-black dark:text-white">
                  {t("home.welcomeUser", { username })}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSudokuBattle}
                    className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white transition-colors hover:bg-[#383838] dark:bg-white dark:text-black dark:hover:bg-[#ccc]"
                  >
                    {t("home.sudokuBattle")}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-8 text-black transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a]"
                  >
                    {t("common.logout")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="flex h-12 w-full items-center justify-center rounded-full bg-black px-8 text-white transition-colors hover:bg-[#383838] dark:bg-white dark:text-black dark:hover:bg-[#ccc] sm:w-auto"
              >
                {t("common.login")}
              </button>
              <button
                onClick={handleRegister}
                className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-8 text-black transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:text-white dark:hover:bg-[#1a1a1a] sm:w-auto"
              >
                {t("common.register")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
