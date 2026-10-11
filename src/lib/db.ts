import type { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
import { SCHEMA_STATEMENTS, SEED_USERS } from "./schema";

/**
 * Minimal query interface shared by node-postgres (production) and PGlite (local/tests).
 * Both return `{ rows }` and accept `$1`-style parameters, so the app code is identical.
 */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool: Pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
    return pool as unknown as Db;
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is required in deployed environments (local file storage is not persistent on serverless).");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  if (process.env.PGLITE_MEMORY) return new PGlite() as unknown as Db;
  const { mkdirSync } = await import("node:fs");
  mkdirSync("./.data", { recursive: true }); // PGlite won't create parent dirs on a fresh clone
  const pg: PGlite = new PGlite("./.data/pglite");
  return pg as unknown as Db;
}

async function migrate(db: Db) {
  for (const stmt of SCHEMA_STATEMENTS) await db.query(stmt);
  for (const u of SEED_USERS) {
    await db.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [u.id, u.email, u.name],
    );
  }
}

/** Lazily connects and runs idempotent migrations + seed once per process. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__db) {
    globalForDb.__db = (async () => {
      const db = await connect();
      await migrate(db);
      return db;
    })().catch((err) => {
      globalForDb.__db = undefined; // allow retry on next request
      throw err;
    });
  }
  return globalForDb.__db;
}

/** Test helper: drop the cached connection so each test file gets a fresh in-memory DB. */
export function resetDbForTests() {
  globalForDb.__db = undefined;
}
