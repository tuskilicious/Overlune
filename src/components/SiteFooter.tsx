import { Link } from "react-router";
import "./site-footer.css";

export const contactEmail = "support@overlune.in";
/** The public repo (T6.77): the code, and the place to report a problem. */
export const repoUrl = "https://github.com/tuskilicious/Overlune";
/** Optional support (T6.80). Overlune never handles money; GitHub Sponsors does, and it unlocks nothing. */
export const supportUrl = "https://github.com/sponsors/tuskilicious";

/**
 * Footer for the site's pages (never on overlays, which are shown on stream). Link groups over a large outlined
 * wordmark (T6.148, after 21st.dev's "Footer with Minimal Outline"; behavior and layout only, no code copied).
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-groups">
        <div>
          <p id="footer-make">Make</p>
          <ul aria-labelledby="footer-make">
            <li>
              <Link to="/editor">Editor</Link>
            </li>
            <li>
              <Link to="/guide">Setup guide</Link>
            </li>
          </ul>
        </div>
        <div>
          <p id="footer-project">Project</p>
          <ul aria-labelledby="footer-project">
            <li>
              <a href={repoUrl}>Open source on GitHub</a>
            </li>
            <li>
              <a href={`${repoUrl}/issues/new`}>Report a problem</a>
            </li>
            <li>
              <a href={supportUrl}>Support Overlune</a>
            </li>
          </ul>
        </div>
        <div>
          <p id="footer-legal">Legal</p>
          <ul aria-labelledby="footer-legal">
            <li>
              <Link to="/privacy">Privacy</Link>
            </li>
            <li>
              <Link to="/terms">Terms</Link>
            </li>
          </ul>
        </div>
        <div>
          <p id="footer-contact">Contact</p>
          <ul aria-labelledby="footer-contact">
            <li>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </li>
          </ul>
        </div>
      </div>
      {/* The wordmark is drawn by CSS (site-footer.css): decoration, not page text. */}
      <div aria-hidden className="site-footer-mark" />
    </footer>
  );
}
