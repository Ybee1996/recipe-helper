import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionValue,
  passwordMatches,
  sessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password =
    typeof body === "object" && body && "password" in body
      ? (body as { password: unknown }).password
      : null;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!process.env.AUTH_SECRET || !process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 });
  }

  if (!(await passwordMatches(password))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionValue(), sessionCookieOptions());
  return res;
}
