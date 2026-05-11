/**
 * API 配置
 * 使用环境变量 NEXT_PUBLIC_API_URL，如果没有设置则使用本地开发默认值
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

/**
 * 获取完整的 API 端点 URL
 * @param endpoint API 端点路径（如 '/api/auth/login'）
 * @returns 完整的 API URL
 */
export function getApiUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  return `${baseUrl}${path}`;
}

/**
 * Cross-subdomain auth uses an HttpOnly cookie set on the portal API.
 * Every portal API call must opt into sending cookies, otherwise the
 * browser strips them on cross-origin (and cross-subdomain) requests.
 */
export function apiFetch(endpoint: string, init: RequestInit = {}): Promise<Response> {
  return fetch(getApiUrl(endpoint), {
    ...init,
    credentials: 'include',
  });
}

