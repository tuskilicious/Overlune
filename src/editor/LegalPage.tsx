import { useMemo } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { parseMarkdown, type Inline } from "../lib/markdown";
import { useHeadingAbove } from "../lib/useHeadingAbove";
import { brandFor } from "./brand";
import { useSiteTheme } from "../lib/site-theme";
import { themeVars } from "../themes/vars";
import privacy from "../../docs/legal/privacy.md?raw";
import terms from "../../docs/legal/terms.md?raw";
import "./editor.css";
import "./guide.css";

const sources = { privacy, terms };

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

/** A heading's plain text, and an id for it ("Your rights" → "your-rights"). */
const plain = (parts: Inline[]) => parts.map((p) => ("text" in p ? p.text : p.href)).join("");
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * /privacy and /terms (T6.13): docs/legal/*.md stays the one source, rendered as React elements in the guide's style.
 * Since T8.3 they share the guide's layout: an index built from the document's own headings (no second copy), sticky
 * beside the text on wide windows and marking the part you're reading.
 */
export default function LegalPage({ page }: { page: keyof typeof sources }) {
  const siteTheme = useSiteTheme();
  const blocks = useMemo(() => parseMarkdown(sources[page]), [page]);
  const title = blocks.find((b) => b.type === "h1");
  const headings = useMemo(
    () =>
      blocks.flatMap((b) =>
        b.type === "h2" ? [[slug(plain(b.content)), plain(b.content)] as const] : [],
      ),
    [blocks],
  );
  const ids = useMemo(() => headings.map(([id]) => id), [headings]);
  const reading = useHeadingAbove(ids);
  return (
    <div className="editor guide site-sky" style={themeVars(brandFor(siteTheme))}>
      <SiteNav />
      <div className="guide-layout legal-layout">
        <header className="editor-header legal">
          {title && <h1>{renderInline(title.content)}</h1>}
        </header>
        <nav className="guide-index" aria-label="On this page">
          <ol>
            {headings.map(([id, name]) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={reading === id ? "location" : undefined}>
                  {name}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <main className="legal">
          {blocks.map((b, i) => {
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
            if (b.type === "h1") return null; // in the header above
            if (b.type === "h2")
              return (
                <h2 key={i} id={slug(plain(b.content))}>
                  {renderInline(b.content)}
                </h2>
              );
            if (b.type === "quote")
              return (
                <blockquote key={i}>
                  <p>{renderInline(b.content)}</p>
                </blockquote>
              );
            return <p key={i}>{renderInline(b.content)}</p>;
          })}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
