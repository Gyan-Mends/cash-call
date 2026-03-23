/**
 * Escape special characters in a string for safe use in MongoDB $regex queries.
 * Prevents ReDoS and NoSQL injection via regex patterns.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
