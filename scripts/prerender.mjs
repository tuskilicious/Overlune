// Prerenders Overlune's public pages into dist/ after `vite build` (Phase 15: T15.1 spike, T15.2, T15.3).
//
// The build already writes a shell per site page with its own title and link-preview tags (vite.config.ts,
// src/lib/page-meta.ts): index.html, editor.html, guide.html, privacy.html and terms.html. This fills in the public
// pages' bodies. Pages serves index.html for any path without a file of its own, so once index.html is the prerendered
// home page, the overlays (/o/*) are sent to an untouched copy of the shell, app.html, by `_redirects`, and a
// prerendered 404.html answers unknown paths with a real 404. The editor keeps its own shell. The app still starts
// with createRoot, which replaces the saved HTML on load with the same markup.
//
// Inline styles: the CSP (`style-src 'self'`) blocks style attributes in markup, so each element's inline style is
// moved into a stylesheet of the site's own (`[data-ps="n"]`, `!important` so it still wins as an inline style does),
// named by its content's hash. The pages then look right before any script runs, with nothing for the CSP to block.
//
// Each look gets its own page, /looks/<id> (T15.3): a shell with its title and link-preview tags, then prerendered like
// the rest. Its pictures are the real Starting Soon overlay on both canvases, taken here with the look's sample text
// and a fixed clock. The looks come from the app's own registry (src/lib/look-pages.ts, loaded by Vite), so a new
// look gets a page and pictures without a change here.
//
// Usage: npm run build && node scripts/prerender.mjs   (needs Playwright's Chromium: npx playwright install chromium)
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const PORT = 4180;
const origin = `http://localhost:${PORT}`;
/** Route, the file Pages serves for it (extension-less: /guide serves guide.html), and the least text it must have
 *  before any script runs: a check that the page really rendered. */
const pages = [
  ["/", "index.html", 4000],
  ["/guide", "guide.html", 4000],
  ["/privacy", "privacy.html", 4000],
  ["/terms", "terms.html", 2000],
  ["/this-page-does-not-exist", "404.html", 100],
];

const fail = (message) => {
  throw new Error(`prerender: ${message}`);
};

const vite = await createServer({
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
  // lz-string is CommonJS: bundled first, so the link code can import it by name as the app does.
  ssr: { noExternal: ["lz-string"], optimizeDeps: { include: ["lz-string"] } },
});
const [{ themeIds }, { lookPages, stills }, { lookPath, pageHtml }, { encode }, { sampleScene }] =
  await Promise.all(
    [
      "/src/themes/types.ts",
      "/src/lib/look-pages.ts",
      "/src/lib/page-meta.ts",
      "/src/settings/url.ts",
      "/src/editor/scene-samples.ts",
    ].map((path) => vite.ssrLoadModule(path)),
  );
await vite.close();

const shell = await readFile("dist/index.html", "utf8");
await copyFile("dist/index.html", "dist/app.html");
const srcs = [...shell.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
if (!srcs.length) fail("no module script in the built index.html");

await mkdir("dist/looks", { recursive: true });
for (const id of themeIds) {
  const path = lookPath(id);
  await writeFile(`dist${path}.html`, pageHtml(shell, path, lookPages[path]));
  pages.push([path, `${path.slice(1)}.html`, 600]);
}

// shell: true for Windows' npx; every argument here is fixed, nothing comes from outside.
const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  shell: true,
  stdio: "ignore",
});
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      if (i > 60) fail("vite preview didn't start");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const browser = await chromium.launch();
  // Reduced motion: every reveal and entrance at its end state, never caught mid-animation.
  const context = await browser.newContext({ reducedMotion: "reduce", colorScheme: "dark" });

  // The looks' pictures, before index.html is replaced: the overlays still run from it here. The clock is fixed, so
  // the countdown reads the same on every build and an unchanged look keeps the same files.
  const now = Date.parse("2026-01-01T17:00:00Z");
  await mkdir("dist/images/looks", { recursive: true });
  for (const id of themeIds) {
    const sample = sampleScene(id);
    const settings = {
      ...sample,
      starting: { ...sample.starting, endsAt: now + 26 * 3_600_000, tz: "UTC" },
    };
    for (const [canvas, width, height, query] of [
      ["landscape", 1920, 1080, ""],
      ["portrait", 1080, 1920, "?canvas=vertical"],
    ]) {
      const page = await context.newPage();
      await page.clock.setFixedTime(now);
      await page.setViewportSize({ width, height });
      await page.goto(`${origin}/o/starting${query}#${encode(settings)}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      if ((await page.locator(".scene").getAttribute("data-theme")) !== id)
        fail(`${id}: the ${canvas} overlay didn't show the look`);
      await page.screenshot({ path: `dist${stills(id)[canvas]}`, type: "jpeg", quality: 82 });
      await page.close();
    }
    console.log(`pictured ${id} -> dist${stills(id).landscape}, dist${stills(id).portrait}`);
  }

  await mkdir("dist/assets/prerender", { recursive: true });
  for (const [route, file, minText] of pages) {
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const {
      html: saved,
      rules,
      text,
      h1,
    } = await page.evaluate(() => {
      const root = document.documentElement;
      // The visitor's own light or dark choice is applied before first paint by the app; don't freeze ours in.
      delete root.dataset.siteTheme;
      root.removeAttribute("style");
      // The scene previews on the home page and in the gallery each have an overlay's <h1> ("Starting soon"). In the
      // saved page they'd come before the page's own heading, so they become plain elements here (no stylesheet
      // targets a scene's h1 by its tag). The overlays themselves, and the app once it runs, are unchanged.
      document.querySelectorAll(".scene h1").forEach((h) => {
        const div = document.createElement("div");
        for (const { name, value } of h.attributes) div.setAttribute(name, value);
        div.replaceChildren(...h.childNodes);
        h.replaceWith(div);
      });
      const rules = [];
      document.querySelectorAll("body [style]").forEach((el, i) => {
        const decls = [];
        for (let j = 0; j < el.style.length; j++) {
          const name = el.style[j];
          decls.push(`${name}: ${el.style.getPropertyValue(name)} !important;`);
        }
        el.removeAttribute("style");
        if (!decls.length) return;
        el.setAttribute("data-ps", String(i));
        rules.push(`[data-ps="${i}"] { ${decls.join(" ")} }`);
      });
      return {
        html: "<!doctype html>\n" + root.outerHTML,
        rules,
        text: document.body.innerText.trim().length,
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      };
    });
    let html = saved.replace(/\s+data-reveal-done=""/g, "");
    // The app's theme code can set the root's colour scheme again just after it's cleared; drop whatever is left.
    html = html.replace(/^(<!doctype html>\n<html[^>]*?)\sstyle="[^"]*"/, "$1");
    // Tags the app added while it ran (its lazy chunks' scripts and stylesheets) are saved with this temporary
    // server's address; make them site-relative again, or the live page would load from localhost.
    html = html.replaceAll(origin, "");
    if (html.includes("localhost")) fail(`${route}: a localhost address is left in the page`);
    for (const src of srcs)
      if (!html.includes(`src="${src}"`)) fail(`${route}: the app's script ${src} is missing`);
    const leftover = html.match(/<[a-z][^<>]*\sstyle="[^"]*"/i);
    if (leftover)
      fail(`${route}: an inline style is left in the page: ${leftover[0].slice(0, 160)}`);
    if (!h1) fail(`${route}: no heading`);
    if (text < minText) fail(`${route}: only ${text} characters of text`);
    if (rules.length) {
      const css = rules.join("\n") + "\n";
      const name = `${file.replace(".html", "").replaceAll("/", "-")}-${createHash("sha256").update(css).digest("hex").slice(0, 8)}.css`;
      await writeFile(`dist/assets/prerender/${name}`, css);
      html = html.replace(
        "</head>",
        `<link rel="stylesheet" href="/assets/prerender/${name}"></head>`,
      );
    }
    await writeFile(`dist/${file}`, html);
    await page.close();
    console.log(
      `prerendered ${route} -> dist/${file}: "${h1}", ${text} characters, ${rules.length} styles moved`,
    );
  }
  await browser.close();
  if ((await readFile("dist/app.html", "utf8")) !== shell)
    fail("app.html isn't the untouched shell");
  await writeFile(
    "dist/_redirects",
    "# The overlays run the untouched app shell; the public pages are prerendered (scripts/prerender.mjs).\n" +
      // `/app`, not `/app.html`: Pages answers .html addresses with a 308 to the extension-less one.
      "/o/* /app 200\n",
  );
} finally {
  server.kill();
}
