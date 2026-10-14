import { useSyncExternalStore } from "react";

/** The site's light or dark mode (the home page, editor, guide, legal pages and not-found page; never an overlay). */
export type SiteTheme = "light" | "dark";

const KEY = "overlune-site-theme";
const light = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;

/** The streamer's pick in this browser, if they made one: a convenience kept in local storage, never in a link. */
function stored(): SiteTheme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

let current: SiteTheme = stored() ?? (light() ? "light" : "dark");
const listeners = new Set<() => void>();

/** Marks the page, for the CSS (`:root[data-site-theme="light"]`), and the browser's own controls. */
export function applySiteTheme(theme: SiteTheme = current) {
  document.documentElement.dataset.siteTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function setSiteTheme(theme: SiteTheme) {
  current = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private windows may refuse storage: the pick still holds for this visit.
  }
  applySiteTheme(theme);
  listeners.forEach((l) => l());
}

// Until they pick, follow the system's setting as it changes.
if (typeof matchMedia === "function")
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (stored()) return;
    current = light() ? "light" : "dark";
    if (document.documentElement.dataset.siteTheme) applySiteTheme();
    listeners.forEach((l) => l());
  });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSiteTheme = () => useSyncExternalStore(subscribe, () => current);
