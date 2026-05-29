import { AUTH_ENV_KEYS } from "@/lib/auth-config";

/** クライアント（ブラウザ）で NEXT_PUBLIC_* から認証情報を取得 */
export function getClientAuthCredentials() {
  return {
    id: process.env.NEXT_PUBLIC_APP_ID?.trim() ?? "",
    password: process.env.NEXT_PUBLIC_APP_PASSWORD ?? "",
  };
}

export function isClientAuthConfigured(): boolean {
  const { id, password } = getClientAuthCredentials();
  return Boolean(id && password);
}

export function verifyClientLogin(id: string, password: string): boolean {
  const expected = getClientAuthCredentials();
  if (!expected.id || !expected.password) return false;
  return id.trim() === expected.id && password === expected.password;
}

/** タブを閉じると消える sessionStorage キー */
export const AUTH_SESSION_STORAGE_KEY = "wmdmap-auth";

export function setClientAuthSession(): void {
  sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, "1");
}

export function clearClientAuthSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function hasClientAuthSession(): boolean {
  return sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) === "1";
}

export async function logoutClient(): Promise<void> {
  clearClientAuthSession();
  await fetch("/api/auth/logout", { method: "POST" });
}
