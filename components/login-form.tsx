"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setClientAuthSession } from "@/lib/auth-client";
import { appUi } from "@/lib/ui";

type LoginFormProps = {
  expectedId: string;
  expectedPassword: string;
};

export function LoginForm({ expectedId, expectedPassword }: LoginFormProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedId = id.trim();

    try {
      if (!expectedId || !expectedPassword) {
        setError(
          "認証設定が読み込めません。.env.local に NEXT_PUBLIC_APP_ID と NEXT_PUBLIC_APP_PASSWORD を設定し、サーバーを再起動してください。"
        );
        return;
      }

      if (trimmedId !== expectedId || password !== expectedPassword) {
        setError("ID またはパスワードが正しくありません");
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trimmedId, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }

      setClientAuthSession();
      router.replace("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div>
        <label
          htmlFor="login-id"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          ID
        </label>
        <input
          id="login-id"
          type="text"
          name="id"
          autoComplete="username"
          value={id}
          onChange={(event) => setId(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          パスワード
        </label>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          disabled={loading}
          required
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}

export function LoginPageContent({
  expectedId,
  expectedPassword,
}: LoginFormProps) {
  return (
    <div
      className={`flex min-h-[100dvh] items-center justify-center ${appUi.pageBg} px-4 py-8`}
    >
      <div
        className={`w-full max-w-md ${appUi.card} border border-slate-100 p-8 shadow-lg`}
      >
        <header className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            WMD Map
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            月明洞マップ
          </h1>
        </header>
        <LoginForm
          expectedId={expectedId}
          expectedPassword={expectedPassword}
        />
      </div>
    </div>
  );
}