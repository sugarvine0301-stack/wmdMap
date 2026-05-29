/**
 * 認証用の公開環境変数（サーバー実行時に .env.local から読み込む）
 * クライアントでは process.env 直接参照せず、Server Component から props で渡す
 */
export function getPublicAppCredentials() {
  const id = process.env.NEXT_PUBLIC_APP_ID ?? "";
  const password = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "";

  return {
    id: id.trim(),
    password,
  };
}

export function isPublicAppAuthConfigured(): boolean {
  const { id, password } = getPublicAppCredentials();
  return id.length > 0 && password.length > 0;
}

export function verifyPublicAppLogin(id: string, password: string): boolean {
  const expected = getPublicAppCredentials();
  if (!expected.id || !expected.password) return false;
  return id.trim() === expected.id && password === expected.password;
}

export type LoginCredentialsProps = {
  expectedId: string;
  expectedPassword: string;
};

/** Server Component から Client Component へ渡す用 */
export function getLoginCredentialsProps(): LoginCredentialsProps {
  const { id, password } = getPublicAppCredentials();
  return { expectedId: id, expectedPassword: password };
}
