const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getSiteUrl(): URL {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_URL;
  const normalized = normalizeSiteUrl(fromEnv ?? FALLBACK_SITE_URL);
  return new URL(normalized);
}
