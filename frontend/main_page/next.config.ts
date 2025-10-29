import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // 启用 standalone 输出模式，优化 Docker 构建
};

export default nextConfig;
