import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lookPages } from "../../../src/lib/look-pages";
import { pageHtml, pages } from "../../../src/lib/page-meta";
import { themeIds } from "../../../src/themes/types";

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

  it("every look in the registry has a page (T15.3)", () => {
    expect(Object.keys(lookPages)).toEqual(themeIds.map((id) => `/looks/${id}`));
    const all = Object.values(lookPages);
    expect(new Set(all.map((p) => p.title)).size).toBe(themeIds.length);
    expect(new Set(all.map((p) => p.description)).size).toBe(themeIds.length);
  });

  it.each(Object.keys(lookPages))("%s previews with its own picture of the look", (path) => {
    const page = lookPages[path]!;
    const html = pageHtml(index, path, page).replace(/\s+/g, " ");
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://overlune.in${path}" />`);
    expect(html).toContain(`<meta property="og:image" content="${page.image!.url}" />`);
    expect(html).toContain('<meta property="og:image:width" content="1920" />');
    expect(html).toContain('<meta property="og:image:height" content="1080" />');
    expect(html).toContain(`property="og:image:alt" content="${page.image!.alt}"`);
    expect(html).not.toContain('content="https://overlune.in/images/brand/og-image.png"');
  });

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
