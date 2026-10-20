// Prerenders Overlune's public pages into dist/ after `vite build` (Phase 15, T15.1 spike).
//
// The build already writes a shell per site page with its own title and link-preview tags (vite.config.ts,
// src/lib/page-meta.ts): index.html, editor.html, guide.html, privacy.html and terms.html. This fills in the public
// pages' bodies. Pages serves index.html for any path without a file of its own, so once index.html is the prerendered
// home page, the overlays (/o/*) are sent to an untouched copy of the shell, app.html, by `_redirects`, and a
// prerendered 404.html answers unknown paths with a real 404. The editor keeps its own shell. The app still starts
// with createRoot, which replaces the saved HTML on load.
//
// Usage: node scripts/prerender.mjs   (after `npm run build`; needs Playwright's Chromium)
import { spawn } from "node:child_process";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const PORT = 4180;
const origin = `http://localhost:${PORT}`;
/** Route, then the file Pages serves for it (extension-less: /guide serves guide.html). */
const pages = [
  ["/", "index.html"],
  ["/guide", "guide.html"],
  ["/privacy", "privacy.html"],
  ["/terms", "terms.html"],
  ["/this-page-does-not-exist", "404.html"],
];

await copyFile("dist/index.html", "dist/app.html");

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  shell: true,
  stdio: "ignore",
});
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      if (i > 60) throw new Error("vite preview didn't start");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const browser = await chromium.launch();
  // Reduced motion: every reveal and entrance at its end state, never caught mid-animation.
  const context = await browser.newContext({ reducedMotion: "reduce", colorScheme: "dark" });
  const shell = await readFile("dist/app.html", "utf8");
  for (const [route, file] of pages) {
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    let html = await page.evaluate(() => {
      const root = document.documentElement;
      // The visitor's own light or dark choice is applied before first paint by the app; don't freeze ours in.
      delete root.dataset.siteTheme;
      root.style.removeProperty("color-scheme");
      if (!root.getAttribute("style")) root.removeAttribute("style");
      return "<!doctype html>\n" + root.outerHTML;
    });
    // The saved page must still load the app exactly as the shell does: the same module scripts. (The browser
    // rewrites attribute order when it saves, so compare the sources, not the tags.)
    const srcs = [...shell.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    if (!srcs.length) throw new Error("no module script in the shell");
    for (const src of srcs)
      if (!html.includes(`src="${src}"`))
        throw new Error(`${route}: the app's script ${src} is missing`);
    html = html.replace(/\s+data-reveal-done=""/g, "");
    // Tags the app added while it ran (its lazy chunks' scripts and stylesheets) are saved with this temporary
    // server's address; make them site-relative again, or the live page would load from localhost.
    html = html.replaceAll(origin, "");
    if (html.includes("localhost"))
      throw new Error(`${route}: a localhost address is left in the page`);
    await writeFile(`dist/${file}`, html);
    await page.close();
    console.log(`prerendered ${route} -> dist/${file} (${(html.length / 1024).toFixed(0)} KB)`);
  }
  await browser.close();
  await writeFile(
    "dist/_redirects",
    "# The editor and the overlays run the app shell; the public pages are prerendered (scripts/prerender.mjs).\n" +
      // `/app`, not `/app.html`: Pages answers .html addresses with a 308 to the extension-less one.
      "/o/* /app 200\n",
  );
} finally {
  server.kill();
}
