"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "./api";

const ACCEPT = ".txt,.md,.docx";
const MAX_BYTES = 5 * 1024 * 1024;

export default function DashboardActions() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"new" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createBlank() {
    setBusy("new");
    setError(null);
    try {
      const doc = await api<{ id: string }>("/api/documents", { method: "POST", body: JSON.stringify({}) });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setError(null);
    // Client-side checks for fast feedback; the server re-validates everything.
    if (!/\.(txt|md|docx)$/i.test(file.name)) return setError("Upload a .txt, .md, or .docx file.");
    if (file.size > MAX_BYTES) return setError("Files must be 5 MB or smaller.");
    setBusy("import");
    try {
      const form = new FormData();
      form.append("file", file);
      const doc = await api<{ id: string }>("/api/documents/import", { method: "POST", body: form });
      router.push(`/docs/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="dash-actions">
        <button onClick={() => fileRef.current?.click()} disabled={busy !== null}>
          {busy === "import" ? "Importing…" : "Import file"}
        </button>
        <button className="primary" onClick={createBlank} disabled={busy !== null}>
          {busy === "new" ? "Creating…" : "New document"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
        />
      </div>
      <div className="hint">Import turns a .txt, .md, or .docx file (up to 5 MB) into a new editable document.</div>
      {error && <div className="error-banner" role="alert" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
