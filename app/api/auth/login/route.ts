import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCredentials,
  getSessionCookieOptions,
  verifyLogin,
} from "@/lib/auth-server";
import { createSessionToken } from "@/lib/auth-token";

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

  if (!verifyLogin(id, password)) {
    return NextResponse.json(
      { error: "ID またはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const creds = getAuthCredentials();
  const token =
    creds.id && creds.password
      ? createSessionToken(creds.id, creds.password)
      : createSessionToken(id, password);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
  return response;
}
