import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteDocument, getDocumentForUser, updateDocument } from "@/lib/documents";
import { withErrors } from "@/lib/errors";
import { updateDocumentSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: { id: string } };

export const GET = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return NextResponse.json(await getDocumentForUser(params.id, user.id));
});

export const PATCH = withErrors<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const patch = updateDocumentSchema.parse(await req.json());
  const doc = await updateDocument(params.id, user.id, patch);
  return NextResponse.json({ id: doc.id, title: doc.title, updated_at: doc.updated_at });
});

export const DELETE = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await deleteDocument(params.id, user.id);
  return new NextResponse(null, { status: 204 });
});
