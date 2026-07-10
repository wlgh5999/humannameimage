"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValid = /^\d{4}$/.test(password);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid || isSubmitting) {
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "로그인에 실패했습니다.");
      }

      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-lg border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur">
        <p className="text-sm font-extrabold text-[#5F8F8B]">휴먼임팩트 교육 홍보물</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">제목 생성기</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
          내부용 도구입니다. 4자리 비밀번호를 입력해주세요.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-black tracking-[-0.02em] text-slate-600">비밀번호</span>
            <input
              autoComplete="one-time-code"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none transition placeholder:tracking-normal focus:border-[#5F8F8B] focus:ring-4 focus:ring-[#5F8F8B]/10"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!isValid || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "확인 중..." : "들어가기"}
          </button>
        </form>
      </section>
    </main>
  );
}
