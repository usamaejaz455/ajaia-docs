"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Toolbar from "./Toolbar";
import ShareDialog from "./ShareDialog";
import { api } from "./api";

type Role = "owner" | "editor" | "viewer";
type Status = "saved" | "dirty" | "saving" | "error";
type Props = { doc: { id: string; title: string; content: string; updatedAt: string }; role: Role };

const SAVE_DELAY_MS = 800;

export default function EditorView({ doc, role }: Props) {
  const router = useRouter();
  const canEdit = role !== "viewer";
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState<Status>("saved");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // Pending changes are accumulated here and flushed by a single debounced save,
  // so rapid typing never produces overlapping requests.
  const pending = useRef<{ title?: string; content?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const lastSavedTitle = useRef(doc.title);

  const flush = useCallback(async () => {
    if (inFlight.current) return; // will re-run when the current request finishes
    const patch = pending.current;
    if (patch.title === undefined && patch.content === undefined) return;
    pending.current = {};
    inFlight.current = true;
    setStatus("saving");
    try {
      await api(`/api/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (patch.title !== undefined) lastSavedTitle.current = patch.title;
      setErrorMsg(null);
      const more = pending.current.title !== undefined || pending.current.content !== undefined;
      setStatus(more ? "dirty" : "saved");
      inFlight.current = false;
      if (more) void flush();
    } catch (e) {
      // Put the failed changes back (newer edits win) so a retry sends them again.
      pending.current = { ...patch, ...pending.current };
      inFlight.current = false;
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  }, [doc.id]);

  const schedule = useCallback(
    (change: { title?: string; content?: string }) => {
      pending.current = { ...pending.current, ...change };
      setStatus("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false, // avoid SSR hydration mismatch
    onUpdate: ({ editor }) => schedule({ content: editor.getHTML() }),
  });

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status !== "saved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  function onTitleChange(v: string) {
    setTitle(v);
    const trimmed = v.trim();
    if (!trimmed || trimmed.length > 200) {
      setStatus("error");
      setErrorMsg(!trimmed ? "Title can't be empty." : "Title must be 200 characters or fewer.");
      return;
    }
    if (trimmed !== lastSavedTitle.current) schedule({ title: trimmed });
  }

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      router.replace("/docs");
      router.refresh();
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  }

  const statusText: Record<Status, string> = {
    saved: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    error: errorMsg ?? "Couldn't save",
  };

  return (
    <div className="editor-shell">
      <header className="editor-head">
        <div className="editor-head-row">
          <Link href="/docs" className="button ghost" onClick={() => router.refresh()} aria-label="Back to documents">← Docs</Link>
          <input
            className="title-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && editor?.commands.focus("start")}
            disabled={!canEdit}
            aria-label="Document title"
            maxLength={200}
          />
          {canEdit ? (
            <span className={`save-status ${status === "error" ? "error" : ""}`} role="status" aria-live="polite">
              {statusText[status]}
              {status === "error" && pending.current.content !== undefined && (
                <> · <button className="ghost" style={{ padding: 0, color: "inherit", textDecoration: "underline" }} onClick={() => void flush()}>Retry</button></>
              )}
            </span>
          ) : (
            <span className="role-note">View only</span>
          )}
          {role === "owner" && (
            <>
              <button className="primary" onClick={() => setSharing(true)}>Share</button>
              <button className="danger" onClick={onDelete}>Delete</button>
            </>
          )}
          {role === "editor" && <span className="role-note">Shared with you · can edit</span>}
        </div>
        {canEdit && editor && <Toolbar editor={editor} />}
      </header>
      <div className="desk">
        <article className="page">
          <EditorContent editor={editor} />
        </article>
      </div>
      {sharing && <ShareDialog docId={doc.id} onClose={() => setSharing(false)} />}
    </div>
  );
}
