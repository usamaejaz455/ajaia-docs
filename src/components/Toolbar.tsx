"use client";
import type { Editor } from "@tiptap/react";

type Btn = { label: string; title: string; active?: () => boolean; run: () => void; style?: React.CSSProperties };

export default function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const groups: Btn[][] = [
    [
      { label: "B", title: "Bold (Ctrl+B)", active: () => editor.isActive("bold"), run: () => c().toggleBold().run(), style: { fontWeight: 800 } },
      { label: "I", title: "Italic (Ctrl+I)", active: () => editor.isActive("italic"), run: () => c().toggleItalic().run(), style: { fontStyle: "italic" } },
      { label: "U", title: "Underline (Ctrl+U)", active: () => editor.isActive("underline"), run: () => c().toggleUnderline().run(), style: { textDecoration: "underline" } },
    ],
    [
      { label: "Text", title: "Normal text", active: () => editor.isActive("paragraph") && !["bulletList", "orderedList", "blockquote"].some((n) => editor.isActive(n)), run: () => c().setParagraph().run() },
      { label: "H1", title: "Heading 1", active: () => editor.isActive("heading", { level: 1 }), run: () => c().toggleHeading({ level: 1 }).run() },
      { label: "H2", title: "Heading 2", active: () => editor.isActive("heading", { level: 2 }), run: () => c().toggleHeading({ level: 2 }).run() },
      { label: "H3", title: "Heading 3", active: () => editor.isActive("heading", { level: 3 }), run: () => c().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "• List", title: "Bulleted list", active: () => editor.isActive("bulletList"), run: () => c().toggleBulletList().run() },
      { label: "1. List", title: "Numbered list", active: () => editor.isActive("orderedList"), run: () => c().toggleOrderedList().run() },
      { label: "Quote", title: "Quote", active: () => editor.isActive("blockquote"), run: () => c().toggleBlockquote().run() },
    ],
    [
      { label: "Undo", title: "Undo (Ctrl+Z)", run: () => c().undo().run() },
      { label: "Redo", title: "Redo (Ctrl+Shift+Z)", run: () => c().redo().run() },
    ],
  ];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {groups.map((g, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="sep" aria-hidden />}
          {g.map((b) => {
            const on = b.active?.() ?? false;
            return (
              <button
                key={b.title}
                type="button"
                title={b.title}
                aria-label={b.title}
                aria-pressed={b.active ? on : undefined}
                className={on ? "active" : ""}
                style={b.style}
                onMouseDown={(e) => e.preventDefault()} // keep editor selection
                onClick={b.run}
              >
                {b.label}
              </button>
            );
          })}
        </span>
      ))}
    </div>
  );
}
