# AI workflow note

## Tools used

- **Claude (Anthropic), in a chat with a sandboxed code-execution environment**: planning, scoping, code generation, running installs/builds/tests, and scripted browser testing (Playwright) with screenshots I reviewed.
- **Claude Code (VS Code extension)**: pre-deploy verification on my machine (clean install, tests, typecheck, production build, HTTP smoke test of the share and import flows), a dependency audit, and debugging the first Vercel deploy.

## How I used it

I treated the AI as a fast implementer and reviewer, and kept product and architecture decisions with me:

1. **Scope first.** I asked for a scoped plan against the brief before any code: must-haves, deliberate cuts, and a stack that could be deployed for free. I accepted the cut list (no real-time, no real auth, no attachments) because it protected time for the editing loop and sharing correctness.
2. **Build bottom-up in layers.** Schema and data access → authorization rules → API routes → UI. Each layer was compiled or tested before moving on, rather than generating everything at once.
3. **Verify in a real environment.** Every claim was checked by running it: typecheck, unit/integration tests, production build, an HTTP smoke test of all endpoints, and a headless browser run that typed into the editor, reloaded, and switched users.

## Where AI materially sped things up

- Boilerplate across ~25 files (route handlers, zod schemas, editor toolbar, share dialog, CSS) in minutes rather than hours.
- Writing the integration test suite for permission rules, including edge cases I'd likely have skipped under time pressure (case-insensitive emails, sharing with yourself, revoke then access).
- Scripted Playwright and curl checks, which found bugs before I deployed.

## What I changed or rejected

- **Rejected Prisma** (the usual default suggestion): codegen and engine binary downloads add setup friction and failure modes for reviewers. Raw SQL over `pg`/PGlite is ~10 queries and easier to read.
- **Rejected SQLite** for deployment: not persistent on serverless. Chose Postgres everywhere, with embedded PGlite so local runs and tests still need zero setup.
- **Dependency fixes:** the first install failed on a Tiptap peer-dependency conflict, and the initial Next.js version carried a published security advisory (Vercel may block vulnerable versions). Both were pinned to compatible, patched releases.
- **Bug caught by the smoke test:** on a fresh clone the app returned 500s because PGlite doesn't create its parent `.data/` directory. Fixed with an explicit `mkdir`, then re-tested from a clean state.
- **UX fix from screenshot review:** the "Text" toolbar button showed active inside lists (list items contain paragraphs), which looked like two conflicting states. Changed the active logic.
- **Storage format:** chose HTML over Tiptap JSON so the import pipeline (markdown/docx → HTML) works server-side without a DOM shim, and added an allow-list sanitizer since HTML is stored.
- **Security choices I insisted on:** 404 instead of 403 for documents you can't access, HMAC-signed session cookie instead of a plain user id, and server-side re-validation of everything the client also checks.
- **Pre-deploy dependency audit, and a deploy bug it caused:** `npm audit` flagged advisories in the libraries that handle untrusted input. Upgrading `mammoth` (1.8 → 1.13) was clean. Upgrading `sanitize-html` to 2.18 passed tests locally on Node 24 but broke the first Vercel deploy: it now `require()`s an ESM-only `htmlparser2`, which only some Node versions can load, so every route that sanitizes HTML returned 500. I reproduced it with a standalone production build on Node 18 (`ERR_REQUIRE_ESM`), reverted to 2.13.0, and confirmed the advisories' payloads are stripped by our allow-list (no attributes, no SVG/form/textarea tags). The same Node 18 run caught a second bug: the import route used `instanceof File`, which doesn't exist globally on Node 18; fixed with a type check. Next.js stays on 14.2.35, the latest 14.x: its open advisories need a major upgrade, and the app doesn't use the affected features (`next/image`, server actions, middleware, rewrites). Moving to Next 15 is on the follow-up list.

## How I verified correctness, UX, and reliability

| Area | How |
|---|---|
| Permissions | 7 integration tests against a real (in-memory) Postgres; HTTP checks for 401/403/404, forged cookies |
| Persistence | Reload in browser; full server restart and re-fetch; formatting HTML compared before/after |
| Import | Unit tests for md/txt/invalid files; a real `.docx` generated with python-docx and imported end to end |
| UX | Read through screenshots of each screen (login, editor, share dialog, shared list, view-only), fixed what looked wrong |
| Build health | `tsc --noEmit`, `next build`, all tests green before packaging |

What I did **not** take on trust: anything about permissions, any dependency version, and anything I hadn't seen run.
