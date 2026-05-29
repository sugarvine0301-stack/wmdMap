import { AUTH_COOKIE_NAME } from "@/lib/auth-config";
import {
  getPublicAppCredentials,
  isPublicAppAuthConfigured,
  verifyPublicAppLogin,
} from "@/lib/auth-public-env";
import { createSessionToken } from "@/lib/auth-token";

export function getAuthCredentials() {
  return getPublicAppCredentials();
}

export function getSessionToken(): string {
  const { id, password } = getAuthCredentials();
  if (!id || !password) return "";
  return createSessionToken(id, password);
}

export { isPublicAppAuthConfigured as isAuthConfigured };

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const { id, password } = getAuthCredentials();
  if (!id || !password) return false;

  return token === createSessionToken(id, password);
}

export function verifyLogin(id: string, password: string): boolean {
  return verifyPublicAppLogin(id, password);
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
