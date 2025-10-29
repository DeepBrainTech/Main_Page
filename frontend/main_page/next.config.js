const createNextIntlPlugin = require('next-intl/plugin');

// 配置文件路径（相对于 next.config.js）
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone', // 启用 standalone 输出模式，优化 Docker 构建
};

module.exports = withNextIntl(nextConfig);
