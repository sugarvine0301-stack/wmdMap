import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getClearCookieOptions } from "@/lib/auth-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", getClearCookieOptions());
  return response;
}
