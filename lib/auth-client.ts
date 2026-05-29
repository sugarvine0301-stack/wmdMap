/** タブを閉じると消える sessionStorage キー（クライアント専用） */
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

/** sessionStorage を消し、サーバー側のセッションクッキーも削除 */
export async function logoutClient(): Promise<void> {
  clearClientAuthSession();
  await fetch("/api/auth/logout", { method: "POST" });
}
