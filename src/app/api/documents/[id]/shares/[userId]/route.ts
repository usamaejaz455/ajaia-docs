import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { revokeShare } from "@/lib/documents";
import { withErrors } from "@/lib/errors";

export const runtime = "nodejs";
type Ctx = { params: { id: string; userId: string } };

export const DELETE = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await revokeShare(params.id, user.id, params.userId);
  return new NextResponse(null, { status: 204 });
});
