import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry before rendering anything.
initSentry();

// ?rm=1 forces reduced motion (public link contract, docs/STACK.md). OBS doesn't always pass on the OS setting.
if (new URLSearchParams(location.search).get("rm") === "1")
  document.documentElement.dataset.rm = "";

// A tab opened before a new deploy asks for page files the deploy replaced. Reload to get the new ones,
// at most once in 10 seconds so a broken deploy can't loop.
window.addEventListener("vite:preloadError", (event) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem("overlune-reloaded")) < 10_000) return;
    sessionStorage.setItem("overlune-reloaded", String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

// React 19 error hooks report render errors to Sentry.
createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn("Uncaught error", error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
