import { AUTH_COOKIE_NAME, AUTH_ENV_KEYS } from "@/lib/auth-config";

export function getAuthCredentials() {
  return {
    id: process.env[AUTH_ENV_KEYS.id] ?? "",
    password: process.env[AUTH_ENV_KEYS.password] ?? "",
    sessionSecret: process.env[AUTH_ENV_KEYS.sessionSecret] ?? "",
  };
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const { sessionSecret } = getAuthCredentials();
  if (!sessionSecret) return false;
  return token === sessionSecret;
}

export function verifyLogin(id: string, password: string): boolean {
  const creds = getAuthCredentials();
  if (!creds.id || !creds.password || !creds.sessionSecret) return false;
  return id === creds.id && password === creds.password;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // maxAge なし = ブラウザセッションクッキー（ウィンドウを閉じると削除）
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export { AUTH_COOKIE_NAME };
