export const SESSION_COOKIE = "recipe_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

const encoder = new TextEncoder();

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded =
      value.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((value.length + 3) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(): Promise<CryptoKey | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signPayload(payload: string): Promise<Uint8Array | null> {
  const key = await hmacKey();
  if (!key) return null;
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return new Uint8Array(sig);
}

export async function createSessionValue(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = String(exp);
  const sig = await signPayload(payload);
  if (!sig) throw new Error("AUTH_SECRET is not set");
  return `${payload}.${bytesToBase64Url(sig)}`;
}

export async function verifySession(
  value: string | undefined,
): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const given = base64UrlToBytes(value.slice(dot + 1));
  const exp = Number(payload);
  if (!given || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await signPayload(payload);
  if (!expected) return false;
  return timingSafeEqual(expected, given);
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(digest);
}

async function secretsEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  return timingSafeEqual(ha, hb);
}

export async function passwordMatches(password: string): Promise<boolean> {
  const primary = process.env.SITE_PASSWORD;
  if (!primary) return false;
  const secondary = process.env.SITE_PASSWORD_2 || primary;
  const [matchPrimary, matchSecondary] = await Promise.all([
    secretsEqual(password, primary),
    secretsEqual(password, secondary),
  ]);
  return matchPrimary || matchSecondary;
}

