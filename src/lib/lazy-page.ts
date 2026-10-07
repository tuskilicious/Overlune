import { lazy, type ComponentType } from "react";

/** The module, or a promise that never settles when there's none. */
export function orWait<T>(module: T | undefined): T | Promise<never> {
  return module ?? new Promise<never>(() => {});
}

/** A page loaded on its own (T6.82). When a deploy replaced its file, main.tsx cancels the failed load and reloads
 *  the tab; the import then resolves to nothing, so keep waiting for the reload instead of crashing on the way out
 *  (Sentry JAVASCRIPT-REACT-7). */
export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  return lazy(() => load().then((m) => orWait<typeof m>(m)));
}
