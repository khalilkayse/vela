/** ISO country helpers. Detection uses CDN/proxy headers (Cloudflare, etc.). */

const HEADER_COUNTRY = [
  "cf-ipcountry",
  "cf-ip-country",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-geo-country",
  "x-appengine-country",
];

const HEADER_IP = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for", "true-client-ip"];

const SKIP_COUNTRY = new Set(["", "XX", "T1", "ZZ", "A1", "A2"]);

export function normalizeCountry(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code) || SKIP_COUNTRY.has(code)) return null;
  return code;
}

export function countryFromHeaders(headers: Headers | null | undefined): string | null {
  if (!headers) return null;
  for (const name of HEADER_COUNTRY) {
    const code = normalizeCountry(headers.get(name));
    if (code) return code;
  }
  return null;
}

export function ipFromHeaders(headers: Headers | null | undefined): string | null {
  if (!headers) return null;
  for (const name of HEADER_IP) {
    const raw = headers.get(name);
    if (!raw) continue;
    const first = raw.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return null;
}

export function headersFromAuthContext(ctx: unknown): Headers | null {
  if (!ctx || typeof ctx !== "object") return null;
  const rec = ctx as { request?: Request; headers?: Headers; context?: { request?: Request } };
  if (rec.request instanceof Request) return rec.request.headers;
  if (rec.headers instanceof Headers) return rec.headers;
  if (rec.context?.request instanceof Request) return rec.context.request.headers;
  return null;
}

export function countryName(code: string | null | undefined): string {
  const normalized = normalizeCountry(code);
  if (!normalized) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export function formatCountry(code: string | null | undefined): string {
  const normalized = normalizeCountry(code);
  if (!normalized) return "—";
  const name = countryName(normalized);
  return name && name !== normalized ? `${name} (${normalized})` : normalized;
}

export function allCountryCodes(): string[] {
  return ISO_3166_1_ALPHA_2;
}

/** ISO 3166-1 alpha-2 (common set for the picker). */
const ISO_3166_1_ALPHA_2 = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AR","AT","AU","AW","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BM","BN","BO","BR","BS","BT","BW","BY","BZ",
  "CA","CD","CF","CG","CH","CI","CL","CM","CN","CO","CR","CU","CV","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","ER","ES","ET",
  "FI","FJ","FM","FR",
  "GA","GB","GD","GE","GH","GM","GN","GQ","GR","GT","GW","GY",
  "HK","HN","HR","HT","HU",
  "ID","IE","IL","IN","IQ","IR","IS","IT",
  "JM","JO","JP",
  "KE","KG","KH","KM","KN","KR","KW","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MG","MK","ML","MM","MN","MR","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NE","NG","NI","NL","NO","NP","NZ",
  "OM",
  "PA","PE","PG","PH","PK","PL","PS","PT","PY",
  "QA",
  "RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SR","SS","ST","SV","SY","SZ",
  "TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TW","TZ",
  "UA","UG","US","UY","UZ",
  "VC","VE","VN","VU",
  "WS",
  "YE",
  "ZA","ZM","ZW",
];


export function parseCountryList(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[\s,;]+/)) {
    const code = normalizeCountry(part);
    if (code && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}
