import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { themeIds } from "../../src/themes/types";

// Each look's default layout (T9.3): measured from its composed scene, it must render the same as that scene.

const scenes = ["starting", "brb", "ending", "offline"] as const;
const NOW = new Date("2026-10-13T12:00:00Z");

/** Sample content that exercises every part: a subtitle, a countdown, socials and the ticker. */
const sample = (theme: string, ticker: boolean) => ({
  theme,
  socials: [
    { platform: "twitch", handle: "yourname" },
    { platform: "youtube", handle: "yourname" },
  ],
  starting: {
    subtitle: "Chill games and good chat",
    endsAt: NOW.getTime() + 26 * 3600_000,
    tz: "UTC",
  },
  brb: { subtitle: "Grabbing a drink" },
  ending: { subtitle: "See you next stream" },
  offline: { subtitle: "Back on Friday" },
  ticker: { show: ticker, label: "Follow", extra: "New video every Monday" },
});

const link = (scene: string, settings: unknown) =>
  `/o/${scene}#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;

/** A still screenshot of the scene: reduced motion, fonts loaded, the countdown's clock fixed. Within a scene only the
 *  link's `#` part changes, so the page doesn't reload and the last render is still up: wait for the one this link
 *  draws (composed or layout, ticker or not), or the shot can catch the previous one on a busy machine. */
async function shot(page: Page, url: string, { layout = false, ticker = false }) {
  await page.goto(url);
  await page
    .locator(
      `.scene${layout ? "[data-layout]" : ":not([data-layout])"}${ticker ? "[data-ticker]" : ":not([data-ticker])"}`,
    )
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  return page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

/** Playwright's screenshots are Node Buffers (the project has no Node types), as in contrast.spec.ts. */
const base64 = (png: Uint8Array) =>
  (png as unknown as { toString(e: "base64"): string }).toString("base64");

/** Share of pixels that differ by more than a small tolerance, counted in the browser with a canvas. */
async function diffRatio(page: Page, a: Uint8Array, b: Uint8Array) {
  return page.evaluate(
    async ([a, b]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((done) => {
          const img = new Image();
          img.onload = () => done(img);
          img.src = `data:image/png;base64,${src}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const read = (img: HTMLImageElement) => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const [pa, pb] = [read(ia), read(ib)];
      let off = 0;
      for (let i = 0; i < pa.length; i += 4)
        if (
          Math.abs(pa[i]! - pb[i]!) +
            Math.abs(pa[i + 1]! - pb[i + 1]!) +
            Math.abs(pa[i + 2]! - pb[i + 2]!) >
          48
        )
          off++;
      return off / (pa.length / 4);
    },
    [base64(a), base64(b)] as const,
  );
}

test.use({ viewport: { width: 1920, height: 1080 } });

// One test per scene, not per look: Abyss's snow makes its 16 full-size screenshots take twice as long as other
// looks', which ran past the 30s test timeout on a busy machine.
for (const theme of themeIds)
  for (const scene of scenes)
    test(`${theme} ${scene}: the default layout renders like the composed scene`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.clock.setFixedTime(NOW);
      for (const ticker of [false, true]) {
        const settings = sample(theme, ticker);
        const composed = await shot(page, link(scene, settings), { ticker });
        // The editor's own measuring code, loaded from the dev server.
        const elements = await page.evaluate(async (path) => {
          const { measureLayout } = (await import(
            path
          )) as typeof import("../../src/overlays/measure");
          return measureLayout(document.querySelector<HTMLElement>(".scene")!);
        }, "/src/overlays/measure.ts");
        const custom = await shot(
          page,
          link(scene, { ...settings, layouts: { landscape: { scenes: { [scene]: elements } } } }),
          { layout: true, ticker },
        );
        await expect(page.locator(".scene[data-layout]")).toHaveCount(1);
        const ratio = await diffRatio(page, composed, custom);
        expect(ratio, `${theme} ${scene}${ticker ? " with ticker" : ""}`).toBeLessThan(0.005);
      }
    });
