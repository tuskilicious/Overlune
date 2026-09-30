import { sentryEnabled, sentryEnvironment } from "../lib/sentry";

// Verification page from the Sentry React guide. Not routed in production (see App.tsx).
// Visit /_sentry-test#secret-settings and click the button: the event in Sentry
// must NOT contain "#secret-settings".
export default function SentryTestPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
      <h1>Sentry test</h1>
      <p>
        Sentry is <strong>{sentryEnabled ? "on" : "off (VITE_SENTRY_DSN not set)"}</strong>,
        environment: <code>{sentryEnvironment}</code>
      </p>
      <button
        type="button"
        onClick={() => {
          throw new Error("Sentry Test Error");
        }}
      >
        Break the world
      </button>
    </main>
  );
}
