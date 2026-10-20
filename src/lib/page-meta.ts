import { themeIds } from "../themes/types.ts";

export interface Page {
  title: string;
  description: string;
  /** Its own link-preview picture (a look's page, T15.3). Other pages keep the site's. */
  image?: { url: string; alt: string; width: number; height: number };
}

/** Each site page's title and description: the tab title (App.tsx) and its link preview, written at build time (T6.87).
 *  Counts come from the theme list, never typed in (T6.138). The looks' pages are in look-pages.ts. */
export const pages: Record<string, Page> = {
  "/": {
    title: "Overlune: free stream overlays for OBS",
    description: `Free stream overlays that look pro: ${themeIds.length} matching looks for four scenes, chat and alerts. One link per overlay in OBS. No payment, and no account needed.`,
  },
  "/editor": {
    title: "Make your overlays · Overlune",
    description:
      "Pick a look, add your text and copy one link per overlay into OBS. Free, and no account needed.",
  },
  "/guide": {
    title: "Set up your overlays in OBS · Overlune",
    description:
      "Step by step with pictures: paste your Overlune links into OBS or Streamlabs, plus fixes for common problems.",
  },
  "/privacy": {
    title: "Privacy · Overlune",
    description:
      "No trackers, and accounts are optional: your settings live in your link and your browser. What Overlune collects and why.",
  },
  "/terms": {
    title: "Terms · Overlune",
    description: "The terms for using Overlune, a free and open-source stream overlay maker.",
  },
};

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * index.html with a page's own title, description and address, so a shared link previews that page: crawlers don't
 * run JavaScript. Throws if index.html loses a tag this relies on, so the build fails instead of shipping a wrong preview.
 */
export function pageHtml(html: string, path: string, page = pages[path]): string {
  if (!page) throw new Error(`No page meta for ${path}`);
  const title = escape(page.title),
    description = escape(page.description);
  const url = `https://overlune.in${path}`;
  const swaps: [RegExp, string][] = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [/(<meta\s+name="description"\s+content=")[^"]*"/, `$1${description}"`],
    [/(<meta\s+property="og:title"\s+content=")[^"]*"/, `$1${title}"`],
    [/(<meta\s+property="og:description"\s+content=")[^"]*"/, `$1${description}"`],
    [/(<meta\s+property="og:url"\s+content=")[^"]*"/, `$1${url}"`],
    [/(<link\s+rel="canonical"\s+href=")[^"]*"/, `$1${url}"`],
  ];
  if (page.image)
    swaps.push(
      [/(<meta\s+property="og:image"\s+content=")[^"]*"/, `$1${escape(page.image.url)}"`],
      [/(<meta\s+property="og:image:width"\s+content=")[^"]*"/, `$1${page.image.width}"`],
      [/(<meta\s+property="og:image:height"\s+content=")[^"]*"/, `$1${page.image.height}"`],
      [/(<meta\s+property="og:image:alt"\s+content=")[^"]*"/, `$1${escape(page.image.alt)}"`],
    );
  return swaps.reduce((out, [re, to]) => {
    if (!re.test(out)) throw new Error(`index.html has no match for ${re}`);
    return out.replace(re, to);
  }, html);
}
