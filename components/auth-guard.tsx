"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasClientAuthSession, logoutClient } from "@/lib/auth-client";

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * sessionStorage にログイン状態がなければログアウトして /login へ。
 * タブを閉じると sessionStorage が消えるため、再アクセス時はログイン画面になる。
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (hasClientAuthSession()) {
      setAllowed(true);
      return;
    }

    void logoutClient().then(() => {
      router.replace("/login");
    });
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        読み込み中…
      </div>
    );
  }

  return children;
}
