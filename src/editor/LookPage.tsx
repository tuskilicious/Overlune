import { Link, useParams } from "react-router";
import Icon from "../components/Icon";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { stills } from "../lib/look-pages";
import { lookPath } from "../lib/page-meta";
import { useSiteTheme } from "../lib/site-theme";
import { themes } from "../themes";
import { blurbs } from "../themes/blurbs";
import { themeIds, type ThemeId } from "../themes/types";
import { themeVars } from "../themes/vars";
import { brandFor } from "./brand";
import NotFoundPage from "./NotFoundPage";
import "./editor.css";
import "./guide.css";

const swatches = [
  ["primary", "Main"],
  ["accent", "Accent"],
  ["surface", "Panels"],
  ["text", "Text"],
] as const;

/** A look's own page (T15.3): its Starting Soon on both canvases, what comes with it, and a button that opens the
 *  editor with it picked. Every look in the registry gets one, prerendered at build time (scripts/prerender.mjs). */
export default function LookPage() {
  const siteTheme = useSiteTheme();
  const { id } = useParams();
  const i = themeIds.indexOf(id as ThemeId);
  if (i < 0) return <NotFoundPage />;
  const look = themeIds[i]!;
  const theme = themes[look];
  const prev = themeIds.at(i - 1)!;
  const next = themeIds[(i + 1) % themeIds.length]!;
  return (
    <div className="editor guide look-page site-sky" style={themeVars(brandFor(siteTheme))}>
      <SiteNav />
      <main className="look">
        <header className="look-head">
          <Link to="/#looks" className="look-all">
            <Icon name="back" /> All {themeIds.length} looks
          </Link>
          <h1>{theme.name}</h1>
          <p>{blurbs[look]}</p>
          <div className="notfound-actions look-actions">
            <Link to={`/editor?look=${look}`} className="notfound-primary btn-shimmer">
              Use {theme.name}
            </Link>
            <Link to="/guide">How to add it to OBS</Link>
          </div>
        </header>
        <div className="look-stills">
          <figure>
            <img
              src={stills(look).landscape}
              width={1920}
              height={1080}
              fetchPriority="high"
              alt={`${theme.name}'s Starting Soon scene, with a countdown and social handles.`}
            />
            <figcaption>Starting Soon, for a 1920 × 1080 stream</figcaption>
          </figure>
          <figure>
            <img
              src={stills(look).portrait}
              width={1080}
              height={1920}
              alt="The same scene on the vertical canvas."
            />
            <figcaption>Vertical, for phone streams</figcaption>
          </figure>
        </div>
        <section aria-labelledby="look-kit">
          <h2 id="look-kit">Everything comes in {theme.name}</h2>
          <ul>
            <li>Four scenes: Starting Soon, Be Right Back, Stream Ending and Offline</li>
            <li>Just Chatting and Reaction, around your camera</li>
            <li>Chat and alerts to sit over your game, and a webcam frame</li>
            <li>Each one in 16:9 and vertical</li>
          </ul>
          <p>
            Switch looks any time: your text and layout stay, and every overlay changes together.
          </p>
        </section>
        <section aria-labelledby="look-style">
          <h2 id="look-style">Type and colors</h2>
          <p>
            Headings in {theme.fontHeading}, text in {theme.fontBody}. Use these colors to match
            your panels and emotes, or change any of them in the editor.
          </p>
          <ul className="look-swatches">
            {swatches.map(([token, label]) => (
              <li key={token}>
                <span aria-hidden className="look-swatch" style={{ background: theme[token] }} />
                {label} <code>{theme[token]}</code>
              </li>
            ))}
          </ul>
        </section>
        <nav className="look-pager" aria-label="More looks">
          <Link to={lookPath(prev)}>
            <Icon name="back" /> {themes[prev].name}
          </Link>
          <Link to={lookPath(next)}>
            {themes[next].name} <Icon name="next" />
          </Link>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
