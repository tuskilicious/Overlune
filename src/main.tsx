import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry before rendering anything.
initSentry();

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
