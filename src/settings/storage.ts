import type { Settings } from "./schema";
import { decode, encode, type Decoded } from "./url";

// Autosave in this browser only. Stored in the link format, so it gets the same validation and migrations.
// Storage can be blocked or full (private windows, cleared site data), so every call is wrapped.
const KEY = "overlune:settings";

/** The last autosave, or null if there is none or storage is unavailable. */
export function loadSaved(): Decoded | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? decode(saved) : null;
  } catch {
    return null;
  }
}

export function save(settings: Settings): void {
  try {
    localStorage.setItem(KEY, encode(settings));
  } catch {
    // Autosave is a convenience; the link still holds everything.
  }
}
