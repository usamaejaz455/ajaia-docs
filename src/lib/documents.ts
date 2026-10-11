import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { HttpError } from "./errors";
import { can, resolveRole, type Role } from "./access";
import { sanitizeDocumentHtml } from "./sanitize";

export type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DocumentSummary = {
  id: string;
  title: string;
  updated_at: string;
  owner_name: string;
  role: Role;
};

export type ShareEntry = { user_id: string; email: string; name: string; role: "viewer" | "editor" };

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));

function normalize(row: DocumentRow): DocumentRow {
  return { ...row, created_at: iso(row.created_at), updated_at: iso(row.updated_at) };
}

export async function createDocument(ownerId: string, title = "Untitled document", content = ""): Promise<DocumentRow> {
  const db = await getDb();
  const { rows } = await db.query<DocumentRow>(
    `INSERT INTO documents (id, owner_id, title, content) VALUES ($1, $2, $3, $4)
     RETURNING id, owner_id, title, content, created_at, updated_at`,
    [randomUUID(), ownerId, title, sanitizeDocumentHtml(content)],
  );
  return normalize(rows[0]);
}

/**
 * Loads a document together with the caller's role. Returns 404 (not 403) when the
 * user has no access so we don't leak which document ids exist.
 */
export async function getDocumentForUser(docId: string, userId: string): Promise<{ doc: DocumentRow; role: Role }> {
  if (!/^[0-9a-f-]{36}$/i.test(docId)) throw new HttpError(404, "Document not found.");
  const db = await getDb();
  const { rows } = await db.query<DocumentRow & { share_role: "viewer" | "editor" | null }>(
    `SELECT d.id, d.owner_id, d.title, d.content, d.created_at, d.updated_at, s.role AS share_role
       FROM documents d
       LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $2
      WHERE d.id = $1`,
    [docId, userId],
  );
  const row = rows[0];
  const role = row ? resolveRole(row, userId, row.share_role) : null;
  if (!row || !can.view(role)) throw new HttpError(404, "Document not found.");
  const { share_role: _ignored, ...doc } = row;
  return { doc: normalize(doc), role: role! };
}

export async function listDocumentsForUser(userId: string): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[] }> {
  const db = await getDb();
  const owned = await db.query<DocumentSummary>(
    `SELECT d.id, d.title, d.updated_at, u.name AS owner_name, 'owner' AS role
       FROM documents d JOIN users u ON u.id = d.owner_id
      WHERE d.owner_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  const shared = await db.query<DocumentSummary>(
    `SELECT d.id, d.title, d.updated_at, u.name AS owner_name, s.role
       FROM document_shares s
       JOIN documents d ON d.id = s.document_id
       JOIN users u ON u.id = d.owner_id
      WHERE s.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  const fix = (r: DocumentSummary) => ({ ...r, updated_at: iso(r.updated_at) });
  return { owned: owned.rows.map(fix), shared: shared.rows.map(fix) };
}

export async function updateDocument(
  docId: string,
  userId: string,
  patch: { title?: string; content?: string },
): Promise<DocumentRow> {
  const { role } = await getDocumentForUser(docId, userId);
  if (!can.edit(role)) throw new HttpError(403, "You have view-only access to this document.");
  const db = await getDb();
  const { rows } = await db.query<DocumentRow>(
    `UPDATE documents
        SET title = COALESCE($2, title),
            content = COALESCE($3, content),
            updated_at = now()
      WHERE id = $1
      RETURNING id, owner_id, title, content, created_at, updated_at`,
    [docId, patch.title ?? null, patch.content !== undefined ? sanitizeDocumentHtml(patch.content) : null],
  );
  return normalize(rows[0]);
}

export async function deleteDocument(docId: string, userId: string): Promise<void> {
  const { role } = await getDocumentForUser(docId, userId);
  if (!can.delete(role)) throw new HttpError(403, "Only the owner can delete this document.");
  const db = await getDb();
  await db.query("DELETE FROM documents WHERE id = $1", [docId]);
}

export async function listShares(docId: string, userId: string): Promise<ShareEntry[]> {
  await getDocumentForUser(docId, userId); // any collaborator may see who has access
  const db = await getDb();
  const { rows } = await db.query<ShareEntry>(
    `SELECT s.user_id, u.email, u.name, s.role
       FROM document_shares s JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1 ORDER BY u.name`,
    [docId],
  );
  return rows;
}

export async function shareDocument(docId: string, ownerId: string, email: string, role: "viewer" | "editor"): Promise<ShareEntry> {
  const { doc, role: callerRole } = await getDocumentForUser(docId, ownerId);
  if (!can.share(callerRole)) throw new HttpError(403, "Only the owner can share this document.");
  const db = await getDb();
  const { rows: users } = await db.query<{ id: string; email: string; name: string }>(
    "SELECT id, email, name FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  const target = users[0];
  if (!target) throw new HttpError(404, `No user with the email ${email}. Try one of the demo accounts.`);
  if (target.id === doc.owner_id) throw new HttpError(400, "You already own this document.");
  await db.query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [docId, target.id, role],
  );
  return { user_id: target.id, email: target.email, name: target.name, role };
}

export async function revokeShare(docId: string, ownerId: string, targetUserId: string): Promise<void> {
  const { role } = await getDocumentForUser(docId, ownerId);
  if (!can.share(role)) throw new HttpError(403, "Only the owner can change sharing.");
  const db = await getDb();
  await db.query("DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2", [docId, targetUserId]);
}
