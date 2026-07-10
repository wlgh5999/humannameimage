import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "hi_site_auth";
const AUTH_TOKEN_PAYLOAD = "humannameimage-auth-v1";
const ONE_DAY_SECONDS = 60 * 60 * 24;

export function getSitePassword() {
  const password = process.env.SITE_PASSWORD?.trim();

  if (!password) {
    return { error: "SITE_PASSWORD 환경변수가 설정되어 있지 않습니다." };
  }

  if (!/^\d{4}$/.test(password)) {
    return { error: "SITE_PASSWORD는 숫자 4자리여야 합니다." };
  }

  return { password };
}

export function verifySitePassword(input: string) {
  const config = getSitePassword();

  if ("error" in config) {
    return { ok: false, error: config.error };
  }

  return {
    ok: input === config.password,
    error: input === config.password ? undefined : "비밀번호가 올바르지 않습니다."
  };
}

export function createAuthToken() {
  const config = getSitePassword();

  if ("error" in config) {
    throw new Error(config.error);
  }

  return createHmac("sha256", config.password).update(AUTH_TOKEN_PAYLOAD).digest("hex");
}

export function isValidAuthToken(token?: string) {
  if (!token) {
    return false;
  }

  try {
    const expected = createAuthToken();
    const tokenBuffer = Buffer.from(token, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return isValidAuthToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function requireAuthenticated() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return false;
  }

  return true;
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_DAY_SECONDS
  };
}

export function getExpiredAuthCookieOptions() {
  return {
    ...getAuthCookieOptions(),
    maxAge: 0
  };
}
