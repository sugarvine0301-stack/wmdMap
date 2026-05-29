import { AUTH_COOKIE_NAME, AUTH_ENV_KEYS } from "@/lib/auth-config";
import { createSessionToken } from "@/lib/auth-token";

export function getAuthCredentials() {
  return {
    id: process.env.NEXT_PUBLIC_APP_ID?.trim() ?? process.env[AUTH_ENV_KEYS.id]?.trim() ?? "",
    password:
      process.env.NEXT_PUBLIC_APP_PASSWORD ??
      process.env[AUTH_ENV_KEYS.password] ??
      "",
  };
}

export function getSessionToken(): string {
  const { id, password } = getAuthCredentials();
  if (!id || !password) return "";
  return createSessionToken(id, password);
}

export function isAuthConfigured(): boolean {
  const { id, password } = getAuthCredentials();
  return Boolean(id && password);
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const { id, password } = getAuthCredentials();
  if (id && password) {
    return token === createSessionToken(id, password);
  }

  // サーバー環境変数未設定時（Vercel 等）: ログイン API が設定したトークンを許可
  return token.length > 10;
}

export function verifyLogin(id: string, password: string): boolean {
  const creds = getAuthCredentials();
  if (creds.id && creds.password) {
    return id.trim() === creds.id && password === creds.password;
  }
  return Boolean(id.trim() && password);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
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
