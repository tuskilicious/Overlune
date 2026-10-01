import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../../../src/lib/markdown";

describe("parseMarkdown (legal pages, T6.13)", () => {
  it("reads headings, quotes, paragraphs and both list kinds", () => {
    const blocks = parseMarkdown(
      "# Title\n\n> **Note.** Read me.\n\nLine one\nline two.\n\n- a\n- b\n\n1. first\n2. second\n## Next",
    );
    expect(blocks.map((b) => b.type)).toEqual(["h1", "quote", "p", "ul", "ol", "h2"]);
    expect(blocks[2]).toEqual({
      type: "p",
      content: [{ type: "text", text: "Line one line two." }],
    });
    expect(blocks[3]).toMatchObject({ type: "ul", items: [[{ text: "a" }], [{ text: "b" }]] });
  });

  it("reads bold, italic, code and links, keeping a sentence's full stop out of the link", () => {
    expect(
      parseInline("**No accounts.** _Last updated_ the `#` part, see https://sentry.io/privacy/."),
    ).toEqual([
      { type: "bold", text: "No accounts." },
      { type: "text", text: " " },
      { type: "italic", text: "Last updated" },
      { type: "text", text: " the " },
      { type: "code", text: "#" },
      { type: "text", text: " part, see " },
      { type: "link", href: "https://sentry.io/privacy/" },
      { type: "text", text: "." },
    ]);
  });

  it("leaves underscores inside words and non-https addresses as text", () => {
    expect(parseInline("snake_case_name at http://example.com")).toEqual([
      { type: "text", text: "snake_case_name at http://example.com" },
    ]);
  });
});
