import { NextResponse } from "next/server";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { HttpError, withErrors } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = withErrors(async (req: Request) => {
  const { userId } = loginSchema.parse(await req.json());
  const db = await getDb();
  const { rows } = await db.query("SELECT id FROM users WHERE id = $1", [userId]);
  if (!rows[0]) throw new HttpError(404, "Unknown user.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
