import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { HttpError } from "./errors";

export const SESSION_COOKIE = "ajaia_session";

export type User = { id: string; email: string; name: string };

function secret() {
  return process.env.AUTH_SECRET || "dev-only-secret-do-not-use-in-prod";
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

/** Cookie value is `userId.signature` so a user id cannot be forged by editing the cookie. */
export function encodeSession(userId: string) {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(value: string | undefined): string | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = value.slice(0, idx);
  const given = Buffer.from(value.slice(idx + 1));
  const expected = Buffer.from(sign(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}

export async function listUsers(): Promise<User[]> {
  const db = await getDb();
  const { rows } = await db.query<User>("SELECT id, email, name FROM users ORDER BY name");
  return rows;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const db = await getDb();
  const { rows } = await db.query<User>("SELECT id, email, name FROM users WHERE id = $1", [userId]);
  return rows[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  return user;
}
