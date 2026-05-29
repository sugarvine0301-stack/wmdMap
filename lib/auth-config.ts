/** 認証クッキー名（middleware / API / クライアントで共有） */
export const AUTH_COOKIE_NAME = "wmdmap-session";

export const AUTH_ENV_KEYS = {
  id: "WMDMAP_AUTH_ID",
  password: "WMDMAP_AUTH_PASSWORD",
  sessionSecret: "WMDMAP_SESSION_SECRET",
} as const;
