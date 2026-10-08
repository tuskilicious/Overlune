import { Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { lazyPage } from "./lib/lazy-page";
import { pages } from "./lib/page-meta";
import Alerts from "./overlays/alerts/Alerts";
import Chat from "./overlays/chat/Chat";
import FromLink from "./overlays/FromLink";
import Frame from "./overlays/frame/Frame";
import OverlayPlaceholder from "./overlays/OverlayPlaceholder";
import StartingSoon from "./overlays/starting/StartingSoon";
import TextScene from "./overlays/TextScene";
import SentryTestPage from "./components/SentryTestPage";

// GSAP and Tailwind live in this chunk only, so the editor and overlays never load them.
const LandingPage = lazyPage(() => import("./landing/LandingPage"));
// The site pages load on their own too, so an overlay in OBS only loads what it shows (T6.82).
const EditorPage = lazyPage(() => import("./editor/EditorPage"));
const SetupGuide = lazyPage(() => import("./editor/SetupGuide"));
const LegalPage = lazyPage(() => import("./editor/LegalPage"));
const NotFoundPage = lazyPage(() => import("./editor/NotFoundPage"));

/** "/" is always the landing page (T6.34, T6.67); returning visitors get a "Continue your overlay" button there.
 *  The editor used to live here, so its old bookmarks ("/#1.…", a saved overlay) still open /editor with their
 *  settings: old links never break. */
function Home() {
  const { hash } = useLocation();
  if (/^#\d+\./.test(hash)) return <Navigate to={`/editor${hash}`} replace />;
  return <LandingPage />;
}

/** The tab title and canonical address follow the route, so search engines file each page under its own
 *  overlune.in address (one index.html serves every route). Overlay links get no canonical: they're for OBS. */
function PageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const overlay = pathname.startsWith("/o/");
    // Overlays aren't listed in `pages`: OBS never shows their title.
    document.title = pages[pathname]?.title ?? (overlay ? "Overlune" : "Page not found · Overlune");
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) return;
    if (overlay) canonical.remove();
    else canonical.href = `https://overlune.in${pathname}`;
  }, [pathname]);
  return null;
}

// The test page exists in development and staging only (CLAUDE.md §7: no debug routes in production).
// Read from import.meta.env (same fallback as lib/sentry.ts) so the build folds it and drops the page from production.
const showSentryTest =
  (import.meta.env.VITE_SENTRY_ENVIRONMENT ??
    (import.meta.env.DEV ? "development" : "production")) !== "production";

export default function App() {
  return (
    <BrowserRouter>
      <PageMeta />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/guide" element={<SetupGuide />} />
          <Route path="/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/terms" element={<LegalPage page="terms" />} />
          <Route
            path="/o/starting"
            element={
              <FromLink>{(s, error) => <StartingSoon settings={s} error={error} />}</FromLink>
            }
          />
          <Route
            path="/o/offline"
            element={
              <FromLink>
                {(s, error) => <TextScene scene="offline" settings={s} error={error} />}
              </FromLink>
            }
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
          <Route
            path="/o/frame"
            element={<FromLink>{(s, error) => <Frame settings={s} error={error} />}</FromLink>}
          />
          <Route path="/o/:overlay" element={<OverlayPlaceholder />} />
          {showSentryTest && <Route path="/_sentry-test" element={<SentryTestPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
