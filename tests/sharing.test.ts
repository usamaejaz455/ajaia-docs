import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db";
import {
  createDocument,
  getDocumentForUser,
  listDocumentsForUser,
  revokeShare,
  shareDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/documents";
import { HttpError } from "@/lib/errors";

const ALICE = "u_alice";
const BOB = "u_bob";
const CAROL = "u_carol";

async function expectStatus(p: Promise<unknown>, status: number) {
  await expect(p).rejects.toBeInstanceOf(HttpError);
  await p.catch((e: HttpError) => expect(e.status).toBe(status));
}

describe("documents + sharing (integration, in-memory Postgres)", () => {
  beforeEach(() => resetDbForTests());

  it("owner can create, edit, and reopen a document with formatting preserved", async () => {
    const doc = await createDocument(ALICE, "Plan", "<p>hi</p>");
    await updateDocument(doc.id, ALICE, { title: "Q4 Plan", content: "<h1>Goals</h1><ul><li><p><strong>Ship</strong></p></li></ul>" });
    const { doc: reopened, role } = await getDocumentForUser(doc.id, ALICE);
    expect(role).toBe("owner");
    expect(reopened.title).toBe("Q4 Plan");
    expect(reopened.content).toContain("<h1>Goals</h1>");
    expect(reopened.content).toContain("<strong>Ship</strong>");
  });

  it("strips unsafe HTML on save", async () => {
    const doc = await createDocument(ALICE);
    await updateDocument(doc.id, ALICE, { content: '<p onclick="x()">ok</p><script>alert(1)</script>' });
    const { doc: saved } = await getDocumentForUser(doc.id, ALICE);
    expect(saved.content).toBe("<p>ok</p>");
  });

  it("non-collaborators get 404 (no existence leak)", async () => {
    const doc = await createDocument(ALICE);
    await expectStatus(getDocumentForUser(doc.id, BOB), 404);
    await expectStatus(updateDocument(doc.id, BOB, { content: "<p>hack</p>" }), 404);
  });

  it("editor share grants edit; viewer share is read-only", async () => {
    const doc = await createDocument(ALICE, "Shared");
    await shareDocument(doc.id, ALICE, "bob@ajaia.test", "editor");
    await shareDocument(doc.id, ALICE, "CAROL@ajaia.test", "viewer"); // case-insensitive email

    await updateDocument(doc.id, BOB, { content: "<p>bob was here</p>" });
    expect((await getDocumentForUser(doc.id, BOB)).role).toBe("editor");

    expect((await getDocumentForUser(doc.id, CAROL)).role).toBe("viewer");
    await expectStatus(updateDocument(doc.id, CAROL, { content: "<p>nope</p>" }), 403);
  });

  it("only the owner can share, revoke, or delete", async () => {
    const doc = await createDocument(ALICE);
    await shareDocument(doc.id, ALICE, "bob@ajaia.test", "editor");
    await expectStatus(shareDocument(doc.id, BOB, "carol@ajaia.test", "editor"), 403);
    await expectStatus(deleteDocument(doc.id, BOB), 403);

    await revokeShare(doc.id, ALICE, BOB);
    await expectStatus(getDocumentForUser(doc.id, BOB), 404);
  });

  it("dashboard separates owned and shared documents", async () => {
    const mine = await createDocument(ALICE, "Alice's doc");
    const theirs = await createDocument(BOB, "Bob's doc");
    await shareDocument(theirs.id, BOB, "alice@ajaia.test", "viewer");

    const { owned, shared } = await listDocumentsForUser(ALICE);
    expect(owned.map((d) => d.id)).toEqual([mine.id]);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ id: theirs.id, role: "viewer", owner_name: "Bob Okafor" });
  });

  it("rejects sharing with unknown users or yourself", async () => {
    const doc = await createDocument(ALICE);
    await expectStatus(shareDocument(doc.id, ALICE, "nobody@ajaia.test", "editor"), 404);
    await expectStatus(shareDocument(doc.id, ALICE, "alice@ajaia.test", "editor"), 400);
  });
});
