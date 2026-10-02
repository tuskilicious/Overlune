import * as Sentry from "@sentry/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { loadSaved } from "./settings/storage";
import { sentryEnvironment } from "./lib/sentry";
import EditorPage from "./editor/EditorPage";
import SetupGuide from "./editor/SetupGuide";
import LegalPage from "./editor/LegalPage";
import privacy from "../docs/legal/privacy.md?raw";
import terms from "../docs/legal/terms.md?raw";
import Alerts from "./overlays/alerts/Alerts";
import Chat from "./overlays/chat/Chat";
import FromLink from "./overlays/FromLink";
import OverlayPlaceholder from "./overlays/OverlayPlaceholder";
import StartingSoon from "./overlays/starting/StartingSoon";
import TextScene from "./overlays/TextScene";
import SentryTestPage from "./components/SentryTestPage";

// Lets Sentry name page-load/navigation traces by route (e.g. /o/:overlay).
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

// GSAP and Tailwind live in this chunk only, so the editor and overlays never load them.
const LandingPage = lazy(() => import("./landing/LandingPage"));

/** "/" is the landing page for first-time visitors (T6.34). The editor used to live here, so its old
 *  bookmarks ("/#1.…") and anyone with saved work go straight to /editor, keeping the settings. */
function Home() {
  const { hash } = useLocation();
  if (/^#\d+\./.test(hash) || loadSaved()) return <Navigate to={`/editor${hash}`} replace />;
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}

// The test page exists in development and staging only (CLAUDE.md §7: no debug routes in production).
const showSentryTest = sentryEnvironment !== "production";

export default function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/guide" element={<SetupGuide />} />
        <Route path="/privacy" element={<LegalPage source={privacy} />} />
        <Route path="/terms" element={<LegalPage source={terms} />} />
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
