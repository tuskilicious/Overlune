import { Link } from "react-router";
import SiteFooter from "../components/SiteFooter";
import { brandChrome } from "./brand";
import { themeVars } from "../themes/vars";
import "./editor.css";
import "./guide.css";

/** Any address the app doesn't know, e.g. a typo (T6.51). Overlay links have their own placeholder (/o/:overlay). */
export default function NotFoundPage() {
  return (
    <div className="editor guide notfound-page" style={themeVars(brandChrome)}>
      <header className="editor-header">
        <Link to="/" className="guide-logo">
          <img src="/images/brand/logo.png" alt="Overlune home" width="159" height="48" />
        </Link>
      </header>
      {/* One clear way forward and two quieter ones, centered in the space under a soft brand glow (T6.104). */}
      <main className="notfound">
        <h1>This page doesn’t exist</h1>
        <p>The address may have a typo, or the page moved. Pick up from here:</p>
        <div className="notfound-actions">
          <Link to="/editor" className="notfound-primary">
            Make your overlays
          </Link>
          <Link to="/guide">Set up your overlays in OBS</Link>
          <Link to="/">Overlune home</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
