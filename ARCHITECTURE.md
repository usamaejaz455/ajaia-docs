# Architecture note

## What I optimized for

The brief rewards a coherent product slice over feature breadth. I prioritized, in order:

1. **A trustworthy editing loop.** Create → edit with formatting → autosave → reopen exactly as left. If this feels flaky, nothing else matters.
2. **Correct sharing logic.** Ownership, edit vs. view access, and a clear owned/shared split, enforced on the server and covered by tests.
3. **A reviewer-friendly build.** One deployable app, zero-setup local run, seeded accounts, free hosting.
4. **Product-relevant upload.** Import a file into a new editable doc, which is the most common real need.

## Stack and why

| Choice | Why | Alternative considered |
|---|---|---|
| Next.js 14 (App Router, TypeScript) | Frontend + API in one deployable unit; server components load data with no client fetching on first paint | Separate React SPA + Express: more moving parts, two deploys |
| Tiptap (ProseMirror) | Mature schema-based editor; formatting, lists, history, shortcuts out of the box | Slate (more DIY), Quill (weaker schema control) |
| Postgres via `pg`; PGlite locally and in tests | Same SQL dialect everywhere; local dev and tests need no DB install; real constraints (FKs, CHECK, cascade) | Prisma: rejected for codegen and binary downloads that complicate setup; SQLite: not persistent on Vercel |
| Raw parameterized SQL | ~10 queries total; easier to read than an ORM layer at this size | Drizzle: fine, but no benefit here |
| zod | Shared validation with readable error messages | Hand-rolled checks |

## Data model

```
users(id, email UNIQUE, name)
documents(id UUID, owner_id → users, title, content TEXT(HTML), created_at, updated_at)
document_shares(document_id → documents ON DELETE CASCADE, user_id → users,
                role CHECK IN ('viewer','editor'), PRIMARY KEY(document_id, user_id))
```

- **Content is stored as HTML** produced by the editor. It round-trips losslessly through Tiptap, and the import pipeline (markdown, docx) naturally produces HTML. Tiptap JSON would be more structured, but converting imports to JSON on the server requires a DOM shim; HTML kept the pipeline simple. All HTML is passed through an allow-list sanitizer before storage, so stored content can only contain tags the editor supports.
- **Ownership is a column, sharing is a join table.** Role resolution is: owner if `owner_id` matches, else the share row's role, else no access.

## Access control

- `lib/access.ts` holds the rules as pure functions (`can.edit(role)`, `can.share(role)`, ...). `lib/documents.ts` loads the document with the caller's role in one query and checks the rule before every read or write. API routes never make permission decisions themselves.
- Users without access get **404, not 403**, so document IDs can't be probed.
- Owners: edit, rename, share, revoke, delete. Editors: edit and rename. Viewers: read-only (editor is non-editable in the UI and writes are rejected by the API).

## Editing and saving

- Changes are debounced (800 ms) and batched into a single `PATCH {title?, content?}`. Only one request is in flight at a time; edits made during a save are queued and flushed after. Failed saves are kept and can be retried; the header shows *Unsaved changes / Saving… / All changes saved / error*. A `beforeunload` guard warns about unsaved work.
- Concurrency is **last write wins**. Acceptable for this scope and documented; the next step would be an `updated_at` version check (409 on conflict) or Yjs CRDTs for true real-time editing.

## Upload

`POST /api/documents/import` (multipart) → validate extension and size (≤5 MB) → convert (`.txt` paragraphs, `.md` via marked, `.docx` via mammoth) → sanitize → create document → redirect into the editor. Files are processed in memory and not stored, which avoids needing blob storage on serverless hosting.

## Auth

Seeded users with a sign-in picker. The session cookie is `userId.HMAC(userId)` (httpOnly, SameSite=Lax), so the user can't be changed by editing the cookie. This is deliberately a stand-in: swapping in real auth (e.g. NextAuth/Auth.js) only replaces `getCurrentUser()`.

## Testing

- `tests/sharing.test.ts`: integration tests against a real in-memory Postgres. Covers formatting round-trip, sanitization, 404 for strangers, editor vs. viewer permissions, owner-only share/revoke/delete, owned vs. shared listing, invalid share targets.
- `tests/importers.test.ts`: markdown/text/docx conversion, HTML escaping, script stripping, unsupported/empty/corrupt file errors, validation.
- Manually verified with a scripted browser run (Playwright): typing with toolbar and shortcuts, autosave, reload persistence, sharing, and the viewer's read-only state. Also an HTTP smoke test of every endpoint including forged cookies and server restarts.

## Deliberately cut

| Cut | Reason |
|---|---|
| Real-time co-editing / presence | Needs CRDT + websocket infra; high cost, would have crowded out core quality |
| Comments, suggestions, version history | Stretch; each is a feature area of its own |
| Real authentication | Not what's being evaluated; mocked cleanly behind one function |
| File attachments | Import-to-doc is the more product-relevant flow and needs no blob storage |
| Images, tables, fonts/colors in editor | Not in requirements; would widen the sanitizer and import surface |

## Next 2–4 hours

1. Optimistic concurrency (`If-Match: updated_at` → 409 with "reload to see latest").
2. Export to Markdown/PDF (reverse of the import pipeline).
3. Version history: snapshot content on a timer into a `document_versions` table.
4. Playwright e2e test in CI for the share flow; rate limiting on import.
