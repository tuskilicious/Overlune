import * as Sentry from "@sentry/react";
import { BrowserRouter, Route, Routes } from "react-router";
import { sentryEnvironment } from "./lib/sentry";
import EditorPage from "./editor/EditorPage";
import Alerts from "./overlays/alerts/Alerts";
import Chat from "./overlays/chat/Chat";
import FromLink from "./overlays/FromLink";
import OverlayPlaceholder from "./overlays/OverlayPlaceholder";
import StartingSoon from "./overlays/starting/StartingSoon";
import TextScene from "./overlays/TextScene";
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
        <Route
          path="/o/starting"
          element={<FromLink>{(s, error) => <StartingSoon settings={s} error={error} />}</FromLink>}
        />
        <Route
          path="/o/brb"
          element={
            <FromLink>
              {(s, error) => <TextScene scene="brb" settings={s} error={error} />}
            </FromLink>
          }
        />
        <Route
          path="/o/ending"
          element={
            <FromLink>
              {(s, error) => <TextScene scene="ending" settings={s} error={error} />}
            </FromLink>
          }
        />
        <Route
          path="/o/chat"
          element={<FromLink>{(s, error) => <Chat settings={s} error={error} />}</FromLink>}
        />
        <Route
          path="/o/alerts"
          element={<FromLink>{(s, error) => <Alerts settings={s} error={error} />}</FromLink>}
        />
        <Route path="/o/:overlay" element={<OverlayPlaceholder />} />
        {showSentryTest && <Route path="/_sentry-test" element={<SentryTestPage />} />}
      </SentryRoutes>
    </BrowserRouter>
  );
}
