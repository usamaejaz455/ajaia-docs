# Ajaia Docs

A lightweight collaborative document editor: create, format, import, and share documents.

- **Live app:** <LIVE_URL>
- **Walkthrough video:** see `VIDEO_URL.txt`
- **Design notes:** [ARCHITECTURE.md](ARCHITECTURE.md) · **AI workflow:** [AI_WORKFLOW.md](AI_WORKFLOW.md)

## Demo accounts

Auth is mocked: pick an account on the sign-in screen. No passwords.

| Name | Email |
|---|---|
| Alice Chen | alice@ajaia.test |
| Bob Okafor | bob@ajaia.test |
| Carol Diaz | carol@ajaia.test |

**To test sharing:** sign in as Alice in one browser, create a doc, click **Share**, add `bob@ajaia.test` (Can edit) or `carol@ajaia.test` (Can view). Open a private/incognito window, sign in as Bob or Carol, and the doc appears under **Shared with you**.

## Features

- Create, rename, edit, delete documents; autosave with visible save status
- Rich text: bold, italic, underline, H1–H3, bulleted and numbered lists, quotes, undo/redo (plus keyboard shortcuts)
- **File import:** upload `.txt`, `.md`, or `.docx` (max 5 MB) to create a new editable document; formatting (headings, bold/italic, lists) is preserved
- **Sharing:** owner grants **Can edit** or **Can view** access by email, can change or revoke it; dashboard separates *Owned by you* and *Shared with you*; viewers get a read-only editor
- Persistence in Postgres; server-side validation, HTML sanitization, and consistent JSON errors

## Run locally

Requires Node.js 18.18+ (20 recommended). **No database setup needed:** without `DATABASE_URL`, the app uses an embedded Postgres (PGlite) stored in `./.data`.

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm test             # vitest: sharing/permission integration tests + import tests
npm run typecheck
npm run build && npm start
```

Optional `.env.local` (see `.env.example`):

```
DATABASE_URL=postgres://...   # use a real Postgres instead of PGlite
AUTH_SECRET=long-random-string
```

Reset local data: `rm -rf .data`.

## Deploy (Vercel + Neon, both free tiers)

1. Push this repo to GitHub and import it in Vercel (framework: Next.js, defaults are fine).
2. Create a free Postgres database at neon.tech (or via Vercel → Storage → Neon) and copy the connection string.
3. In Vercel → Project → Settings → Environment Variables, set `DATABASE_URL` and `AUTH_SECRET`.
4. Deploy. Tables and demo users are created automatically on first request (idempotent).

## Project structure

```
src/
  app/                 pages (login, dashboard, editor) + API route handlers
    api/documents/     CRUD, /import (upload), /[id]/shares (sharing)
  components/          EditorView (Tiptap + autosave), Toolbar, ShareDialog, ...
  lib/
    access.ts          authorization rules (single source of truth)
    documents.ts       data access + permission checks
    importers.ts       .txt / .md / .docx → sanitized HTML
    db.ts, schema.ts   Postgres (pg) or PGlite, migrations + seed
    auth.ts            signed-cookie mock session
tests/                 vitest suites
docs/screenshots/      UI screenshots
```

## Known limitations

- No real-time co-editing: two editors on the same doc at once means last save wins.
- Mock auth (seeded users, signed cookie). Not production identity.
- Import creates a new document; it doesn't attach files or merge into an existing draft.
- `.docx` import keeps structure and basic formatting; images, tables, and comments are dropped.
