import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documents";
import { HttpError } from "@/lib/errors";
import EditorView from "@/components/EditorView";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const { doc, role } = await getDocumentForUser(params.id, user.id);
    return <EditorView doc={{ id: doc.id, title: doc.title, content: doc.content, updatedAt: doc.updated_at }} role={role} />;
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }
}
