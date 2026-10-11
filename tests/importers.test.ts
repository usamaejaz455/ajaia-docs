import { describe, expect, it } from "vitest";
import { fileToDocumentHtml, titleFromFilename } from "@/lib/importers";
import { updateDocumentSchema } from "@/lib/validation";

describe("file import", () => {
  it("converts markdown headings, emphasis, and lists", async () => {
    const md = "# Title\n\nSome **bold** and *italic*.\n\n- one\n- two\n\n1. first\n";
    const html = await fileToDocumentHtml("notes.md", Buffer.from(md));
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(html).toContain("<ol>");
  });

  it("converts plain text paragraphs and escapes HTML", async () => {
    const html = await fileToDocumentHtml("a.txt", Buffer.from("Hello <b>x</b>\nline 2\n\nPara 2"));
    expect(html).toBe("<p>Hello &lt;b&gt;x&lt;/b&gt;<br />line 2</p><p>Para 2</p>");
  });

  it("strips scripts from markdown", async () => {
    const html = await fileToDocumentHtml("x.md", Buffer.from("hi <script>alert(1)</script>"));
    expect(html).not.toContain("script");
  });

  it("rejects unsupported, empty, and invalid docx files with clear statuses", async () => {
    await expect(fileToDocumentHtml("photo.png", Buffer.from("x"))).rejects.toMatchObject({ status: 415 });
    await expect(fileToDocumentHtml("empty.txt", Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(fileToDocumentHtml("bad.docx", Buffer.from("not a zip"))).rejects.toMatchObject({ status: 400 });
  });

  it("derives a title from the filename", () => {
    expect(titleFromFilename("Meeting notes.docx")).toBe("Meeting notes");
    expect(titleFromFilename(".md")).toBe("Imported document");
  });
});

describe("validation", () => {
  it("rejects empty titles and empty patches", () => {
    expect(updateDocumentSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
    expect(updateDocumentSchema.safeParse({ content: "<p>x</p>" }).success).toBe(true);
  });
});
