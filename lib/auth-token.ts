/** ログイン成功時にクッキーへ保存するトークン（Edge / ブラウザ両対応） */
export function createSessionToken(id: string, password: string): string {
  const raw = `${id.trim()}\0${password}\0wmdmap-auth`;
  const bytes = new TextEncoder().encode(raw);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
