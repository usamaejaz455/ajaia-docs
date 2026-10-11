"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

type Share = { user_id: string; email: string; name: string; role: "viewer" | "editor" };

export default function ShareDialog({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Share[]>(`/api/documents/${docId}/shares`).then(setShares).catch((e) => setError(e.message));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docId, onClose]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api<Share>(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email, role }) });
      setShares((prev) => [...(prev ?? []).filter((p) => p.user_id !== s.user_id), s].sort((a, b) => a.name.localeCompare(b.name)));
      setEmail("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(s: Share, newRole: Share["role"]) {
    try {
      await api(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email: s.email, role: newRole }) });
      setShares((prev) => prev?.map((p) => (p.user_id === s.user_id ? { ...p, role: newRole } : p)) ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(s: Share) {
    try {
      await api(`/api/documents/${docId}/shares/${s.user_id}`, { method: "DELETE" });
      setShares((prev) => prev?.filter((p) => p.user_id !== s.user_id) ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title">Share document</h2>
        <p className="sub">Demo accounts: alice@ajaia.test, bob@ajaia.test, carol@ajaia.test</p>
        <form className="share-form" onSubmit={add}>
          <input
            type="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <select value={role} onChange={(e) => setRole(e.target.value as Share["role"])} aria-label="Access level">
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button className="primary" disabled={busy || !email}>{busy ? "Sharing…" : "Share"}</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        <ul className="access-list" aria-label="People with access">
          {shares === null && !error && <li>Loading…</li>}
          {shares?.length === 0 && <li style={{ color: "var(--muted)" }}>Only you can open this document.</li>}
          {shares?.map((s) => (
            <li key={s.user_id}>
              <span className="person">{s.name}<small>{s.email}</small></span>
              <span style={{ display: "flex", gap: 6 }}>
                <select value={s.role} onChange={(e) => changeRole(s, e.target.value as Share["role"])} aria-label={`Access for ${s.name}`}>
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button className="danger" onClick={() => remove(s)}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
        <div className="dialog-foot"><button onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}
