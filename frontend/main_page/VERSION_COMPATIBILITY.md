# Next.js 15.5.4 版本兼容性说明

## 核心依赖版本

### Next.js 生态系统
- **Next.js**: `15.5.4` (稳定版本)
- **React**: `^18.3.1` (与 Next.js 15.5.4 完全兼容)
- **React DOM**: `^18.3.1` (与 React 版本匹配)
- **next-intl**: `^3.21.0` (支持 Next.js 15 App Router)

### TypeScript 相关
- **TypeScript**: `^5.7.0` (支持 Next.js 15 的类型特性)
- **@types/node**: `^22.0.0` (Node.js 类型定义)
- **@types/react**: `^18.3.12` (React 18 类型定义)
- **@types/react-dom**: `^18.3.1` (React DOM 类型定义)

### 代码质量工具
- **ESLint**: `^9.15.0` (最新稳定版)
- **eslint-config-next**: `15.5.4` (与 Next.js 版本匹配)

### 样式工具
- **Tailwind CSS**: `^4.0.0` (最新版本)
- **@tailwindcss/postcss**: `^4.0.0` (PostCSS 插件)

## 运行时要求

### Node.js
- **最低版本**: `>=20.0.0` (LTS)
- **推荐版本**: `20.x` 或 `22.x` LTS

### npm
- **最低版本**: `>=10.0.0`
- **推荐版本**: 最新稳定版

## 兼容性说明

### Next.js 15.5.4 特性支持
✅ App Router (完全支持)
✅ Server Components (完全支持)
✅ Client Components (完全支持)
✅ 国际化 (next-intl 完全支持)
✅ TypeScript (完全支持)
✅ Tailwind CSS (完全支持)

### React 18 vs React 19
- **当前使用**: React 18.3.1 (更稳定，广泛测试)
- **可选升级**: React 19 (Next.js 15 支持，但可能有一些兼容性问题)
- **建议**: 保持 React 18 直到 React 19 稳定发布

## 已知兼容性问题

### 已解决
1. ✅ next-intl 与 Next.js 的 peer dependency 冲突 - 使用 `--legacy-peer-deps`
2. ✅ Next.js 15 异步 API (params, headers) - 已正确处理
3. ✅ Hydration mismatch - 已修复布局结构

### 注意事项
- 使用 `npm install --legacy-peer-deps` 安装依赖
- Docker 构建时也需要使用 `--legacy-peer-deps` 标志

## 更新建议

当升级依赖时：
1. 保持 Next.js 和 eslint-config-next 版本一致
2. 保持 React 和 @types/react 版本匹配
3. 测试 next-intl 的兼容性
4. 运行完整测试套件

## 参考链接

- [Next.js 15 升级指南](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [next-intl 文档](https://next-intl-docs.vercel.app/)
- [React 18 文档](https://react.dev/)
