"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error("비밀번호가 올바르지 않습니다.");
      }

      window.location.href = "/";
    } catch {
      setError("비밀번호가 올바르지 않습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-lg border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur">
        <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950">제목 생성기</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          팀 전용 도구입니다.
          <br />
          비밀번호를 입력해주세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-black tracking-[-0.02em] text-slate-600">비밀번호</span>
            <input
              aria-label="비밀번호"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "확인 중..." : "들어가기"}
          </button>
        </form>
      </section>
    </main>
  );
}
