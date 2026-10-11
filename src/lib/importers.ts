import { marked } from "marked";
import { HttpError } from "./errors";
import { MAX_UPLOAD_BYTES, SUPPORTED_IMPORT_EXTENSIONS } from "./validation";
import { sanitizeDocumentHtml } from "./sanitize";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text: blank lines separate paragraphs, single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

export function extensionOf(filename: string): string {
  const m = /\.[^.]+$/.exec(filename.toLowerCase());
  return m ? m[0] : "";
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

/** Converts an uploaded file into sanitized editor HTML. Throws HttpError for bad input. */
export async function fileToDocumentHtml(filename: string, buffer: Buffer): Promise<string> {
  if (buffer.byteLength === 0) throw new HttpError(400, "That file is empty.");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files must be 5 MB or smaller.");
  const ext = extensionOf(filename);
  let html: string;
  switch (ext) {
    case ".txt":
      html = textToHtml(buffer.toString("utf8"));
      break;
    case ".md":
    case ".markdown":
      html = markdownToHtml(buffer.toString("utf8"));
      break;
    case ".docx":
      try {
        html = await docxToHtml(buffer);
      } catch {
        throw new HttpError(400, "We couldn't read that .docx file. Check that it isn't corrupted or password-protected.");
      }
      break;
    default:
      throw new HttpError(415, `Unsupported file type. Upload one of: ${SUPPORTED_IMPORT_EXTENSIONS.join(", ")}.`);
  }
  return sanitizeDocumentHtml(html);
}
