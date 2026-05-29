import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getSessionCookieOptions,
  getSessionToken,
  isAuthConfigured,
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

  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "サーバーの認証設定が不完全です（NEXT_PUBLIC_APP_ID / NEXT_PUBLIC_APP_PASSWORD を .env.local に設定してください）",
      },
      { status: 500 }
    );
  }

  if (!verifyLogin(id, password)) {
    return NextResponse.json(
      { error: "ID またはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const sessionToken = getSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());
  return response;
}
