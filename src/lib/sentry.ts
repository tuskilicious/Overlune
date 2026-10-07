const dsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnvironment: string =
  import.meta.env.VITE_SENTRY_ENVIRONMENT ?? (import.meta.env.DEV ? "development" : "production");

/** Off on the local dev server: hot reloads there fail imports on purpose and only add noise. Staging previews and
 *  production report. */
export const sentryEnabled = Boolean(dsn) && !import.meta.env.DEV;

type Capture = (error: unknown, componentStack?: string) => void;

/**
 * Holds errors until Sentry has loaded, then hands them over (T6.93). The SDK is about 150 kB, so it loads after the
 * overlay has drawn instead of before. A short queue, so an error loop can't grow it without end.
 */
export function createReporter() {
  let capture: Capture | null = null;
  const queue: [unknown, string | undefined][] = [];
  return {
    report(error: unknown, componentStack?: string) {
      if (capture) capture(error, componentStack);
      else if (queue.length < 20) queue.push([error, componentStack]);
    },
    ready(c: Capture) {
      capture = c;
      for (const [error, stack] of queue.splice(0)) c(error, stack);
    },
  };
}

const reporter = createReporter();

/** Reports an error to Sentry, now or once it has loaded. Does nothing when Sentry is off (no DSN). */
export function reportError(error: unknown, componentStack?: string): void {
  if (sentryEnabled) reporter.report(error, componentStack);
}

/** Starts Sentry after the page's load event. Window errors from before then are queued, not lost. */
export function startSentry(): void {
  if (!dsn || !sentryEnabled) return;
  const early = (e: ErrorEvent | PromiseRejectionEvent) =>
    reportError("reason" in e ? e.reason : (e.error ?? e.message));
  addEventListener("error", early);
  addEventListener("unhandledrejection", early);
  const load = () =>
    import("./sentry-sdk")
      .then(({ initSentry }) => {
        // From here Sentry's own handlers catch window errors.
        removeEventListener("error", early);
        removeEventListener("unhandledrejection", early);
        reporter.ready(initSentry(dsn, sentryEnvironment));
      })
      .catch(() => {}); // a blocked or failed chunk must never break the overlay
  if (document.readyState === "complete") setTimeout(load);
  else addEventListener("load", () => setTimeout(load), { once: true });
}
