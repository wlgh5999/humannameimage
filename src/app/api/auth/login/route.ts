import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthToken, getAuthCookieOptions, verifySitePassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = String(body.password ?? "");
    const result = verifySitePassword(password);

    if (!result.ok) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, createAuthToken(), getAuthCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
}
