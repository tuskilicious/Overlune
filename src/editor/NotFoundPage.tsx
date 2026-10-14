import { Link } from "react-router";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { brandFor } from "./brand";
import { useSiteTheme } from "../lib/site-theme";
import { themeVars } from "../themes/vars";
import "./editor.css";
import "./guide.css";

/** Any address the app doesn't know, e.g. a typo (T6.51). Overlay links have their own placeholder (/o/:overlay). */
export default function NotFoundPage() {
  const siteTheme = useSiteTheme();
  return (
    <div className="editor guide notfound-page site-sky" style={themeVars(brandFor(siteTheme))}>
      <SiteNav />
      {/* One clear way forward and two quieter ones, centered in the space under a soft brand glow (T6.104). */}
      <main className="notfound">
        <h1>This page doesn’t exist</h1>
        <p>The address may have a typo, or the page moved. Pick up from here:</p>
        <div className="notfound-actions">
          <Link to="/editor" className="notfound-primary btn-shimmer">
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
