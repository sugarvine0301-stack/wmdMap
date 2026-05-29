import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCredentials,
  getSessionCookieOptions,
  verifyLogin,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  let body: { id?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません" },
      { status: 400 }
    );
  }

  const id = body.id?.trim() ?? "";
  const password = body.password ?? "";

  if (!id || !password) {
    return NextResponse.json(
      { error: "ID とパスワードを入力してください" },
      { status: 400 }
    );
  }

  const { sessionSecret } = getAuthCredentials();
  if (!sessionSecret) {
    return NextResponse.json(
      { error: "サーバーの認証設定が不完全です" },
      { status: 500 }
    );
  }

  if (!verifyLogin(id, password)) {
    return NextResponse.json(
      { error: "ID またはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    AUTH_COOKIE_NAME,
    sessionSecret,
    getSessionCookieOptions()
  );
  return response;
}
