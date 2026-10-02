import { Link } from "react-router";
import SiteFooter from "../components/SiteFooter";
import { brandChrome } from "./brand";
import { themeVars } from "../themes/vars";
import "./editor.css";
import "./guide.css";

/** Any address the app doesn't know, e.g. a typo (T6.51). Overlay links have their own placeholder (/o/:overlay). */
export default function NotFoundPage() {
  return (
    <div className="editor guide" style={themeVars(brandChrome)}>
      <header className="editor-header">
        <Link to="/" className="guide-logo">
          <img src="/images/brand/logo.png" alt="Overlune home" width="159" height="48" />
        </Link>
      </header>
      <main className="legal">
        <h1>This page doesn’t exist</h1>
        <p>Check the address for a typo, or go to one of these:</p>
        <ul>
          <li>
            <Link to="/editor">Make your overlays</Link> in the editor
          </li>
          <li>
            <Link to="/guide">Set up your overlays in OBS</Link> with the setup guide
          </li>
          <li>
            <Link to="/">Overlune home</Link>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
