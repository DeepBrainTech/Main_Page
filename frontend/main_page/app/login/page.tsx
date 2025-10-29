"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "登录失败");
      }

      const data = await response.json();
      
      // 保存 token 到 localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_expires_in", String(data.expires_in));

      // 跳转到首页
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md px-6 py-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            DeepBrain Tech
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-zinc-800 text-black dark:text-white"
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            还没有账户？{" "}
            <button
              onClick={() => router.push("/register")}
              className="text-black dark:text-white font-medium hover:underline"
            >
              立即注册
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            返回首页
          </button>
        </div>
      </main>
    </div>
  );
}
