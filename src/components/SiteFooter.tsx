import { Link } from "react-router";

export const contactEmail = "support@overlune.in";

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
          Contact: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </li>
      </ul>
    </footer>
  );
}
