# Submission: Ajaia Docs (Full Stack Product Engineer)

**Candidate:** Usama Ejaz

## Links

| | |
|---|---|
| Live app | https://ajaia-docs-rho-tan.vercel.app |
| Google Drive folder | <DRIVE_FOLDER_URL> |
| Walkthrough video | <VIDEO_URL> |

## Test accounts

No passwords: choose an account on the sign-in page.

- alice@ajaia.test (Alice Chen)
- bob@ajaia.test (Bob Okafor)
- carol@ajaia.test (Carol Diaz)

**Sharing in 1 minute:** as Alice, create a doc → **Share** → add `bob@ajaia.test` as *Can edit* and `carol@ajaia.test` as *Can view*. In an incognito window sign in as Bob (can edit) or Carol (read-only). The doc appears under **Shared with you**.

**Import:** on the dashboard, **Import file** accepts `.txt`, `.md`, `.docx` (≤5 MB).

## What's included in the folder

| Item | Location |
|---|---|
| Source code | `/` (Next.js app: `src/`, tests in `tests/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| This file | `SUBMISSION.md` |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Screenshots | `docs/screenshots/` |

## Status

**Working end to end**
- Create, rename, edit, delete; autosave with save status; reopen with formatting preserved
- Bold, italic, underline, H1–H3, bulleted/numbered lists, quotes, undo/redo
- Import `.txt` / `.md` / `.docx` into a new editable document
- Sharing with owner, *Can edit*, and *Can view* roles; change/revoke access; owned vs. shared sections; read-only editor for viewers
- Postgres persistence; validation, sanitization, consistent error messages
- 13 automated tests (permission integration tests + import/validation tests)
- Stretch delivered: role-based sharing (editor vs. viewer)

**Intentionally not built**
- Real-time co-editing and presence (last save wins)
- Real authentication (seeded accounts with signed-cookie sessions)
- Comments, version history, export, file attachments

**Next 2–4 hours**
1. Conflict detection on save (version check, 409 with reload prompt)
2. Export to Markdown/PDF
3. Version history snapshots
4. Playwright e2e test for the share flow in CI

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000, no database setup needed
npm test
```
