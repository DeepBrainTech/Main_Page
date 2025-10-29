# 多语言支持说明

## 功能特性

✅ **多语言支持**
- 中文（zh）- 默认语言
- 英文（en）
- 可轻松扩展其他语言

✅ **路由结构**
- 自动语言前缀：`/zh`, `/en`
- URL 保持当前语言状态
- 根路径自动重定向到默认语言

✅ **语言切换**
- 页面右上角语言切换器
- 切换时保持当前页面路径
- 语言偏好可扩展（如存储在 localStorage）

## 项目结构

```
frontend/main_page/
├── language/
│   ├── zh.json          # 中文翻译
│   └── en.json          # 英文翻译
├── app/
│   ├── [locale]/        # 多语言路由
│   │   ├── layout.tsx   # 语言布局
│   │   ├── page.tsx     # 首页
│   │   ├── login/       # 登录页
│   │   └── register/    # 注册页
│   └── page.tsx         # 根路径重定向
├── components/
│   └── LanguageSwitcher.tsx  # 语言切换组件
├── i18n.ts              # 国际化配置
└── middleware.ts        # 路由中间件
```

## 使用方法

### 在组件中使用翻译

```tsx
"use client";

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('home.title')}</h1>
      <p>{t('home.welcomeUser', { username: 'John' })}</p>
    </div>
  );
}
```

### 在服务器组件中使用翻译

```tsx
import { getTranslations } from 'next-intl/server';

export default async function ServerComponent({ params }: { params: { locale: string } }) {
  const t = await getTranslations();
  
  return <h1>{t('home.title')}</h1>;
}
```

### 添加新语言

1. 复制 `language/zh.json` 到 `language/[新语言代码].json`
2. 翻译所有文本
3. 在 `i18n.ts` 的 `locales` 数组中添加新语言代码

### 添加新翻译键

在任何 `language/*.json` 文件中添加新的键值对：

```json
{
  "newSection": {
    "key": "翻译文本"
  }
}
```

## URL 结构

- 中文首页: `http://localhost:3000/zh`
- 英文首页: `http://localhost:3000/en`
- 中文登录: `http://localhost:3000/zh/login`
- 英文注册: `http://localhost:3000/en/register`

## 语言切换

使用 `LanguageSwitcher` 组件：

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Page() {
  return (
    <div>
      <LanguageSwitcher />
      {/* 其他内容 */}
    </div>
  );
}
```

## 扩展支持更多语言

只需在以下位置添加新语言：

1. **language/[locale].json** - 创建翻译文件
2. **i18n.ts** - 添加到 locales 数组
3. **LanguageSwitcher.tsx** - 添加切换按钮（可选）

例如添加日语（ja）：

```typescript
// i18n.ts
export const locales = ['zh', 'en', 'ja'] as const;
```

然后创建 `language/ja.json` 并翻译所有内容。

## 注意事项

- 所有页面必须放在 `app/[locale]/` 目录下
- 使用 `useTranslations()` hook 时组件必须是客户端组件（"use client"）
- 路由跳转时需要包含 locale：`router.push(\`/\${locale}/path\`)`
- 中间件会自动处理语言检测和重定向
