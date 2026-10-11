import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { HttpError, withErrors } from "@/lib/errors";
import { fileToDocumentHtml, titleFromFilename } from "@/lib/importers";

export const runtime = "nodejs";

/** Upload a .txt / .md / .docx file and turn it into a new editable document. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected a multipart form upload.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file to upload.");
  const html = await fileToDocumentHtml(file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await createDocument(user.id, titleFromFilename(file.name), html);
  return NextResponse.json({ id: doc.id, title: doc.title }, { status: 201 });
});
