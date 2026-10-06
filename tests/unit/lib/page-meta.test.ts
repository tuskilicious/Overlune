import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageHtml, pages } from "../../../src/lib/page-meta";

const index = readFileSync("index.html", "utf8");

describe("link previews for each page (T6.87)", () => {
  it.each(Object.keys(pages).filter((p) => p !== "/"))(
    "%s gets its own title, description and address",
    (path) => {
      const html = pageHtml(index, path).replace(/\s+/g, " ");
      const { title, description } = pages[path]!;
      const url = `https://overlune.in${path}`;
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<meta name="description" content="${description}" />`);
      expect(html).toContain(`<meta property="og:title" content="${title}" />`);
      expect(html).toContain(`<meta property="og:description" content="${description}" />`);
      expect(html).toContain(`<meta property="og:url" content="${url}" />`);
      expect(html).toContain(`<link rel="canonical" href="${url}" />`);
      // Everything else, like the picture and the app's script, stays as it is.
      expect(html).toContain('content="https://overlune.in/images/brand/og-image.png"');
      expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
    },
  );

  it("the tab titles match the home page's static title", () => {
    expect(index).toContain(`<title>${pages["/"]!.title}</title>`);
  });

  it("fails the build if index.html loses a tag it relies on", () => {
    expect(() => pageHtml(index.replace(/<link rel="canonical"[^>]*>/, ""), "/guide")).toThrow(
      /canonical/,
    );
    expect(() => pageHtml(index, "/nope")).toThrow();
  });
});
