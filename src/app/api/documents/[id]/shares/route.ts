import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listShares, shareDocument } from "@/lib/documents";
import { withErrors } from "@/lib/errors";
import { shareSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: { id: string } };

export const GET = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return NextResponse.json(await listShares(params.id, user.id));
});

export const POST = withErrors<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { email, role } = shareSchema.parse(await req.json());
  return NextResponse.json(await shareDocument(params.id, user.id, email, role), { status: 201 });
});
