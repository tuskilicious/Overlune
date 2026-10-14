import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import "./site-buttons.css";
import "./site-nav.css";

/**
 * The site's one nav (T8.1): the home page's floating pill on every page, so the site reads as one product. The home
 * page passes its own section links (they mark the section in view); elsewhere they lead to those sections from any
 * page. `action` replaces "Open the editor" (the editor puts the account there). Fixed on the home page, whose hero
 * leaves room for it; sticky on reading pages; static in the editor, whose preview column is sticky itself.
 */
export default function SiteNav({
  links,
  action,
  position = "sticky",
}: {
  links?: ReactNode;
  action?: ReactNode;
  position?: "fixed" | "sticky" | "static";
}) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="site-nav" data-position={position}>
      <Link to="/" className="site-nav-logo">
        <img src="/images/brand/logo.png" alt="Overlune home" width="120" height="36" />
      </Link>
      <ul className="site-nav-links">
        {links ?? (
          <>
            <li>
              <Link to="/#kit">Overlays</Link>
            </li>
            <li>
              <Link to="/#looks">Looks</Link>
            </li>
            <li>
              <Link to="/#how">How it works</Link>
            </li>
            <li>
              <Link to="/guide" aria-current={pathname === "/guide" ? "page" : undefined}>
                Setup guide
              </Link>
            </li>
          </>
        )}
      </ul>
      {action ?? (
        <Link to="/editor" className="site-nav-cta btn-shimmer">
          Open the editor
        </Link>
      )}
    </nav>
  );
}
