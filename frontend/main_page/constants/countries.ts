export interface CountryOption {
  code: string;
  label: string;
}

export const ISO_COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE",
  "BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD",
  "CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM",
  "DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN",
  "KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME",
  "MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM",
  "PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI",
  "SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK",
  "TL","TM","TN","TO","TR","TT","TV","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"
] as const;

function getDisplayNameForCode(code: string, locale: string): string {
  try {
    const display = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    return display || code;
  } catch {
    return code;
  }
}

export function getCountryOptions(locale: string = "en"): CountryOption[] {
  const resolvedLocale = locale === "zh" ? "zh-CN" : "en";
  return [...ISO_COUNTRY_CODES]
    .map((code) => ({
      code,
      label: getDisplayNameForCode(code, resolvedLocale),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, resolvedLocale));
}

export function countryCodeToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  const base = 127397;
  return String.fromCodePoint(...upper.split("").map((char) => base + char.charCodeAt(0)));
}

export function getCountryLabel(code?: string | null, locale: string = "en"): string {
  if (!code) return "—";
  const upper = code.toUpperCase();
  if (!ISO_COUNTRY_CODES.includes(upper as (typeof ISO_COUNTRY_CODES)[number])) return upper;
  return getDisplayNameForCode(upper, locale === "zh" ? "zh-CN" : "en");
}

export function getCountryOptionLabel(code?: string | null, locale: string = "en"): string {
  if (!code) return "";
  const upper = code.toUpperCase();
  if (!ISO_COUNTRY_CODES.includes(upper as (typeof ISO_COUNTRY_CODES)[number])) return upper;
  const resolvedLocale = locale === "zh" ? "zh-CN" : locale;
  return `${getDisplayNameForCode(upper, resolvedLocale)} ${countryCodeToFlag(upper)}`;
}

export function getFlagImageUrl(code?: string | null): string {
  if (!code || code.length !== 2) return "";
  return `/flag160x120/${code.toLowerCase()}.png`;
}

export function getFlagImageSrcSet(code?: string | null): string {
  if (!code || code.length !== 2) return "";
  const path = `/flag160x120/${code.toLowerCase()}.png`;
  return `${path} 1x, ${path} 2x`;
}

export function resolveCountryCode(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  if (ISO_COUNTRY_CODES.includes(upper as (typeof ISO_COUNTRY_CODES)[number])) return upper;

  const suffixMatch = value.match(/\(([A-Za-z]{2})\)\s*$/);
  if (suffixMatch) {
    const code = suffixMatch[1].toUpperCase();
    if (ISO_COUNTRY_CODES.includes(code as (typeof ISO_COUNTRY_CODES)[number])) return code;
  }

  const lower = value.toLowerCase();
  for (const code of ISO_COUNTRY_CODES) {
    const en = getDisplayNameForCode(code, "en").toLowerCase();
    const zh = getDisplayNameForCode(code, "zh-CN").toLowerCase();
    if (lower === en || lower === zh) return code;
  }
  return null;
}
