import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsForUser, type DocumentSummary } from "@/lib/documents";
import TopBar from "@/components/TopBar";
import DashboardActions from "@/components/DashboardActions";
import LocalTime from "@/components/LocalTime";
import RefreshOnRestore from "@/components/RefreshOnRestore";

export const dynamic = "force-dynamic";

function DocList({ docs, empty, showOwner }: { docs: DocumentSummary[]; empty: string; showOwner?: boolean }) {
  if (docs.length === 0) return <div className="empty">{empty}</div>;
  return (
    <ul className="doclist">
      {docs.map((d) => (
        <li key={d.id}>
          <Link href={`/docs/${d.id}`}>
            <span className="doc-title">{d.title}</span>
            <span className="doc-meta">
              {showOwner ? <>Owned by {d.owner_name}. </> : null}
              Edited <LocalTime iso={d.updated_at} />
            </span>
            {showOwner ? <span className={`badge ${d.role}`}>{d.role === "editor" ? "Can edit" : "Can view"}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DocsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocumentsForUser(user.id);
  return (
    <>
      <TopBar user={user} />
      <RefreshOnRestore renderId={randomUUID()} />
      <main className="dash">
        <div className="dash-head">
          <h1>Documents</h1>
          <DashboardActions />
        </div>
        <section className="section" aria-labelledby="owned-h">
          <h2 id="owned-h">Owned by you</h2>
          <DocList docs={owned} empty="You haven't created any documents yet. Start a new one or import a file." />
        </section>
        <section className="section" aria-labelledby="shared-h">
          <h2 id="shared-h">Shared with you</h2>
          <DocList docs={shared} showOwner empty="Nothing has been shared with you yet. Documents others share with you will appear here." />
        </section>
      </main>
    </>
  );
}
