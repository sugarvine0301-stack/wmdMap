"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 💡 環境変数の値を直接ここで定義して、万が一の読み込みエラーを完全に回避します
    const correctId = process.env.NEXT_PUBLIC_APP_ID || "wmdMap_2026";
    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD || "wmdMap_2026";

    if (id === correctId && password === correctPassword) {
      // タブを閉じたら消える「sessionStorage」にログイン状態を保存
      sessionStorage.setItem("isLoggedIn", "true");
      // マップ画面へ移動
      router.push("/");
      router.refresh();
    } else {
      setError("IDまたはパスワードが間違っています。");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">WMD MAP</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">月明洞マップ</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div>
              <label className="text-sm font-medium text-gray-700">ID</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">パスワード</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              ログイン
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}