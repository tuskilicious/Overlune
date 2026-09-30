/** User-supplied image URLs (logos) may only be https: (CLAUDE.md §6). Rejects javascript:, data:, http:, etc. */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
