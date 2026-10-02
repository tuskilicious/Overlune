import { Link } from "react-router";
import SiteFooter from "../components/SiteFooter";
import { parseMarkdown, type Inline } from "../lib/markdown";
import { brandChrome } from "./brand";
import { themeVars } from "../themes/vars";
import "./editor.css";
import "./guide.css";

const renderInline = (parts: Inline[]) =>
  parts.map((p, i) => {
    if (p.type === "bold") return <strong key={i}>{p.text}</strong>;
    if (p.type === "italic") return <em key={i}>{p.text}</em>;
    if (p.type === "code") return <code key={i}>{p.text}</code>;
    if (p.type === "link")
      return (
        <a key={i} href={p.href}>
          {p.href}
        </a>
      );
    return p.text;
  });

/** /privacy and /terms (T6.13): docs/legal/*.md stays the one source, rendered as React elements in the guide's style. */
export default function LegalPage({ source }: { source: string }) {
  return (
    <div className="editor guide" style={themeVars(brandChrome)}>
      <header className="editor-header">
        <Link to="/" className="guide-logo">
          <img src="/images/brand/logo.png" alt="Overlune home" width="159" height="48" />
        </Link>
        <p>
          <Link to="/editor">← Back to the editor</Link>
        </p>
      </header>
      <main className="legal">
        {parseMarkdown(source).map((b, i) => {
          if (b.type === "ul" || b.type === "ol") {
            const List = b.type;
            return (
              <List key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }
          if (b.type === "h1") return <h1 key={i}>{renderInline(b.content)}</h1>;
          if (b.type === "h2") return <h2 key={i}>{renderInline(b.content)}</h2>;
          if (b.type === "quote")
            return (
              <blockquote key={i}>
                <p>{renderInline(b.content)}</p>
              </blockquote>
            );
          return <p key={i}>{renderInline(b.content)}</p>;
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
