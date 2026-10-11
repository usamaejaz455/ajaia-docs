export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id    TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     name  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS documents (
     id         UUID PRIMARY KEY,
     owner_id   TEXT NOT NULL REFERENCES users(id),
     title      TEXT NOT NULL,
     content    TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS document_shares (
     document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
     user_id     TEXT NOT NULL REFERENCES users(id),
     role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (document_id, user_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shares_user ON document_shares(user_id)`,
];

/** Seeded demo accounts. Auth is intentionally mocked for this exercise. */
export const SEED_USERS = [
  { id: "u_alice", email: "alice@ajaia.test", name: "Alice Chen" },
  { id: "u_bob", email: "bob@ajaia.test", name: "Bob Okafor" },
  { id: "u_carol", email: "carol@ajaia.test", name: "Carol Diaz" },
] as const;
