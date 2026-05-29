/** 認証クッキー名（middleware / API / クライアントで共有） */
export const AUTH_COOKIE_NAME = "wmdmap-session";

/** .env.local で設定する環境変数名 */
export const AUTH_ENV_KEYS = {
  id: "NEXT_PUBLIC_APP_ID",
  password: "NEXT_PUBLIC_APP_PASSWORD",
} as const;
