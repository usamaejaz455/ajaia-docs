import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { withErrors } from "@/lib/errors";
import { createDocumentSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = withErrors(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocumentsForUser(user.id));
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = createDocumentSchema.parse(await req.json().catch(() => ({})));
  const doc = await createDocument(user.id, body.title, body.content);
  return NextResponse.json(doc, { status: 201 });
});
