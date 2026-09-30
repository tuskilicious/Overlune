import * as Sentry from "@sentry/react";
import { BrowserRouter, Route, Routes } from "react-router";
import { sentryEnvironment } from "./lib/sentry";
import EditorPage from "./editor/EditorPage";
import OverlayPlaceholder from "./overlays/OverlayPlaceholder";
import StartingSoon from "./overlays/starting/StartingSoon";
import SentryTestPage from "./components/SentryTestPage";

// Lets Sentry name page-load/navigation traces by route (e.g. /o/:overlay).
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

// The test page exists in development and staging only (CLAUDE.md §7: no debug routes in production).
const showSentryTest = sentryEnvironment !== "production";

export default function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/o/starting" element={<StartingSoon />} />
        <Route path="/o/:overlay" element={<OverlayPlaceholder />} />
        {showSentryTest && <Route path="/_sentry-test" element={<SentryTestPage />} />}
      </SentryRoutes>
    </BrowserRouter>
  );
}
