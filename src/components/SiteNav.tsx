import type { MouseEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "react-router";
import { setSiteTheme, useSiteTheme } from "../lib/site-theme";
import "./site-buttons.css";
import "./site-nav.css";
import PhoneNotice from "./PhoneNotice";
import { repoUrl } from "./SiteFooter";

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
    <>
      {/* On a phone: Overlune is made on a computer (2.1). */}
      <PhoneNotice />
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
        <div className="site-nav-end">
          {/* Star on GitHub (2.1, the owner): a plain link to the repo, no count, so no call to GitHub's API. */}
          <a className="github-star" href={repoUrl} aria-label="Star on GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9z" />
            </svg>
            <span className="github-star-label">Star on GitHub</span>
          </a>
          <ThemeToggle />
          {action ?? (
            <Link to="/editor" className="site-nav-cta btn-shimmer">
              Open the editor
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

/**
 * Light or dark mode for the site (2.1): follows the system until pressed, then remembers the pick here. After
 * luv-jeri's "Theme Toggle" on 21st.dev (behavior ported, no code): the sun's rays draw in and a bite slides off to make
 * the moon, or back, and the new mode spreads over the page in a circle from the button (the View Transitions API,
 * where the browser has it; otherwise, or with reduced motion, it just switches). Its label, "Light" or "Dark", says the
 * mode in use; the name says what pressing it does.
 */
function ThemeToggle() {
  const theme = useSiteTheme();
  const next = theme === "light" ? "dark" : "light";
  const flip = (e: MouseEvent<HTMLButtonElement>) => {
    const still =
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.rm !== undefined;
    if (still || !document.startViewTransition) return setSiteTheme(next);
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const root = document.documentElement.style;
    root.setProperty("--reveal-x", `${x}px`);
    root.setProperty("--reveal-y", `${y}px`);
    root.setProperty(
      "--reveal-r",
      `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`,
    );
    document.startViewTransition(() => flushSync(() => setSiteTheme(next)));
  };
  return (
    <button
      type="button"
      className="theme-toggle"
      data-mode={theme}
      aria-label={`${theme === "light" ? "Light" : "Dark"}: switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={flip}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <mask id="theme-toggle-bite">
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-toggle-bite" cx="17" cy="7" r="7" fill="#000" />
        </mask>
        <circle
          className="theme-toggle-core"
          cx="12"
          cy="12"
          r="5"
          mask="url(#theme-toggle-bite)"
        />
        <g className="theme-toggle-rays">
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
      <span className="theme-toggle-label">{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
