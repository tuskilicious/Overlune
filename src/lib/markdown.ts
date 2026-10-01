/**
 * The small markdown subset used by docs/legal/*.md, parsed to plain data so pages render it as React elements
 * (never HTML strings). Supports # and ## headings, > quotes, - and 1. lists, paragraphs, **bold**, _italic_,
 * `code` and bare https:// links. Anything else stays as text.
 */
export type Inline =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "code"; text: string }
  | { type: "link"; href: string };

type TextBlock<T extends string> = { type: T; content: Inline[] };
export type Block =
  | TextBlock<"h1">
  | TextBlock<"h2">
  | TextBlock<"quote">
  | TextBlock<"p">
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] };

const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|(?<!\w)_[^_]+_(?!\w)|https:\/\/[^\s)]+)/;

export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  for (const piece of line.split(inlinePattern)) {
    if (!piece) continue;
    if (piece.startsWith("**")) out.push({ type: "bold", text: piece.slice(2, -2) });
    else if (piece.startsWith("`")) out.push({ type: "code", text: piece.slice(1, -1) });
    else if (piece.startsWith("_")) out.push({ type: "italic", text: piece.slice(1, -1) });
    else if (piece.startsWith("https://")) {
      // A full stop or comma after a link ends the sentence, not the address.
      const href = piece.replace(/[.,]+$/, "");
      out.push({ type: "link", href });
      if (href !== piece) out.push({ type: "text", text: piece.slice(href.length) });
    } else out.push({ type: "text", text: piece });
  }
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", content: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const item = /^(-|\d+\.) (.*)$/.exec(line);
    if (item) {
      flush();
      const type = item[1] === "-" ? "ul" : "ol";
      const last = blocks.at(-1);
      if (last?.type === type) last.items.push(parseInline(item[2]!));
      else blocks.push({ type, items: [parseInline(item[2]!)] });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", content: parseInline(line.slice(3)) });
    } else if (line.startsWith("# ")) {
      flush();
      blocks.push({ type: "h1", content: parseInline(line.slice(2)) });
    } else if (line.startsWith("> ")) {
      flush();
      blocks.push({ type: "quote", content: parseInline(line.slice(2)) });
    } else if (line === "") flush();
    else paragraph.push(line);
  }
  flush();
  return blocks;
}
