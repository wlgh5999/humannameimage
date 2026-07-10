import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthToken, getAuthCookieOptions, verifySitePassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = String(body.password ?? "");

    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json({ error: "숫자 4자리 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const result = verifySitePassword(password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, createAuthToken(), getAuthCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
