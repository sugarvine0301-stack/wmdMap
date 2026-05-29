import { AUTH_COOKIE_NAME, AUTH_ENV_KEYS } from "@/lib/auth-config";

export function getAuthCredentials() {
  return {
    id: process.env[AUTH_ENV_KEYS.id]?.trim() ?? "",
    password: process.env[AUTH_ENV_KEYS.password] ?? "",
  };
}

/** ID/パスワードからセッションクッキー用トークンを生成（別途 SECRET 不要） */
export function getSessionToken(): string {
  const { id, password } = getAuthCredentials();
  if (!id || !password) return "";
  return Buffer.from(`${id}\0${password}\0wmdmap-auth`, "utf8").toString(
    "base64url"
  );
}

export function isAuthConfigured(): boolean {
  const { id, password } = getAuthCredentials();
  return Boolean(id && password);
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = getSessionToken();
  if (!expected) return false;
  return token === expected;
}

export function verifyLogin(id: string, password: string): boolean {
  const creds = getAuthCredentials();
  if (!creds.id || !creds.password) return false;
  return id === creds.id && password === creds.password;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // maxAge なし = ブラウザセッションクッキー
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
