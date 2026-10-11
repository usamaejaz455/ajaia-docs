import { z } from "zod";

export const MAX_TITLE = 200;
export const MAX_CONTENT_BYTES = 1_000_000; // ~1 MB of HTML per document
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(MAX_TITLE, `Title must be ${MAX_TITLE} characters or fewer.`);

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
  content: z.string().optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: z
      .string()
      .refine((s) => Buffer.byteLength(s, "utf8") <= MAX_CONTENT_BYTES, "Document is too large to save (1 MB limit).")
      .optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["viewer", "editor"]).default("editor"),
});

export const loginSchema = z.object({ userId: z.string().min(1) });
