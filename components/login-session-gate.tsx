"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasClientAuthSession, logoutClient } from "@/lib/auth-client";

/**
 * ログイン画面: sessionStorage がなければ stale なクッキーを消してログイン表示。
 * sessionStorage があればマップへ。
 */
export function LoginSessionGate() {
  const router = useRouter();

  useEffect(() => {
    if (hasClientAuthSession()) {
      router.replace("/");
      return;
    }
    void logoutClient();
  }, [router]);

  return null;
}
