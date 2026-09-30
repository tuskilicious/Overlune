import { Link } from "react-router";

const docs = "https://github.com/tuskilicious/Overlune/blob/main/docs/legal";
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
          <a href={`${docs}/privacy.md`}>Privacy</a>
        </li>
        <li>
          <a href={`${docs}/terms.md`}>Terms</a>
        </li>
        <li>
          Contact: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </li>
      </ul>
    </footer>
  );
}
