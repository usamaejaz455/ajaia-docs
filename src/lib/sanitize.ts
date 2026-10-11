import sanitizeHtml from "sanitize-html";

/**
 * Allow-list matching what the editor can actually produce. Anything else
 * (scripts, styles, event handlers, iframes) is stripped before it is stored.
 */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "code", "pre", "hr"],
    allowedAttributes: {},
    // Collapse headings beyond h3 into h3 so imported markdown still renders.
    transformTags: { h4: "h3", h5: "h3", h6: "h3" },
  });
}
