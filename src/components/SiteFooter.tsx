import { Link } from "react-router";

export const contactEmail = "support@overlune.in";
/** The public repo (T6.77): the code, and the place to report a problem. */
export const repoUrl = "https://github.com/tuskilicious/Overlune";
/** Optional support (T6.80). Overlune never handles money; GitHub Sponsors does, and it unlocks nothing. */
export const supportUrl = "https://github.com/sponsors/tuskilicious";

/** Footer for the editor and guide pages (never on overlays, which are shown on stream). */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <ul>
        <li>
          <Link to="/guide">Setup guide</Link>
        </li>
        <li>
          <Link to="/privacy">Privacy</Link>
        </li>
        <li>
          <Link to="/terms">Terms</Link>
        </li>
        <li>
          <a href={repoUrl}>Open source on GitHub</a>
        </li>
        <li>
          <a href={`${repoUrl}/issues/new`}>Report a problem</a>
        </li>
        <li>
          <a href={supportUrl}>Support Overlune</a>
        </li>
        <li>
          Contact: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </li>
      </ul>
    </footer>
  );
}
