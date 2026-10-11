export type Role = "owner" | "editor" | "viewer";

/**
 * Single source of truth for authorization decisions.
 * Kept pure (no DB) so the rules are trivially unit-testable.
 */
export const can = {
  view: (role: Role | null) => role !== null,
  edit: (role: Role | null) => role === "owner" || role === "editor",
  rename: (role: Role | null) => role === "owner" || role === "editor",
  share: (role: Role | null) => role === "owner",
  delete: (role: Role | null) => role === "owner",
};

export function resolveRole(doc: { owner_id: string }, userId: string, shareRole: "viewer" | "editor" | null): Role | null {
  if (doc.owner_id === userId) return "owner";
  return shareRole;
}
