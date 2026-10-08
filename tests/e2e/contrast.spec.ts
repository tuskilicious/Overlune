import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { themeIds } from "../../src/themes/types";

// Contrast as rendered (T6.139, the handoff's P0-2; docs/DESIGN.md "Contrast as rendered"). Token pairs miss what a
// viewer actually reads: text straight on a scene's ground, gradients, a look's CSS overrides, outlines drawn under the
// letters. So each look's Starting Soon scene, filled in like the editor's samples, is screenshotted twice: as is, and
// with every letter's fill made transparent (glows are off in both; icons keep their color). The pixels that
// differ are the letters; the second shot is what's behind them. Lettering with a thick outline (Shonen, Skate Deck) is
// read against its outline, so its fill is compared with the outline's color instead. Each text element must reach 3:1 if it's
// large text (24px, or 18.66px bold) and 4.5:1 otherwise (WCAG 1.4.3), at its 10th-percentile pixel, so a busy ground
// (stars, grid lines) is judged where it's worst, without one stray firefly failing it.

const endsAt = Date.now() + 26 * 3_600_000;
const scene = (theme: string) =>
  `/o/starting?rm=1#1.${lz.compressToEncodedURIComponent(
    JSON.stringify({
      theme,
      starting: { subtitle: "Chill games and good chat", endsAt, tz: "UTC" },
      socials: [
        { platform: "twitch", handle: "yourname" },
        { platform: "youtube", handle: "yourname" },
      ],
      ticker: { show: true, label: "Follow" },
    }),
  )}`;

type Item = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  large: boolean;
  /** Fill against outline, for lettering with a thick outline. */
  outlined?: number;
  /** The letters' color and how opaque they end up (their own alpha times every ancestor's opacity); none for a
   *  gradient fill, whose color is then read from the pixels. */
  fill?: number[];
  alpha: number;
};
type Result = { name: string; ratio: number; needs: number; pixels: number };

/** Every element that holds text itself, with its box and whether it's large text. */
const textItems = (page: Page) =>
  page.evaluate(() => {
    const items: Item[] = [];
    const rgb = (c: string) =>
      c
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const seen = new Set<Element>();
    const walk = document.createTreeWalker(document.querySelector(".scene")!, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const el = walk.currentNode.parentElement!;
      if (!walk.currentNode.textContent!.trim() || seen.has(el)) continue;
      seen.add(el);
      // The ticker's second copy is only there for the loop.
      if (el.closest("[aria-hidden='true']")) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 4 || r.height < 4 || r.right < 0 || r.left > innerWidth) continue;
      const px = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      items.push({
        name: `${el.className || el.tagName.toLowerCase()} "${el.textContent!.trim().slice(0, 24)}"`,
        x: Math.max(0, Math.floor(r.left)),
        y: Math.max(0, Math.floor(r.top)),
        w: Math.ceil(Math.min(r.right, innerWidth) - Math.max(0, r.left)),
        h: Math.ceil(Math.min(r.bottom, innerHeight) - Math.max(0, r.top)),
        large: px >= 24 || (bold && px >= 18.66),
        ...(() => {
          const c = cs.color.match(/[\d.]+/g)!.map(Number);
          let alpha = c.length > 3 ? c[3]! : 1;
          for (let e: Element | null = el; e; e = e.parentElement)
            alpha *= Number(getComputedStyle(e).opacity);
          return alpha > 0 ? { fill: c.slice(0, 3), alpha } : { alpha: 1 };
        })(),
        outlined:
          parseFloat(cs.webkitTextStrokeWidth) >= 4
            ? (() => {
                const [a, b] = [lum(rgb(cs.color)), lum(rgb(cs.webkitTextStrokeColor))];
                return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
              })()
            : undefined,
      });
    }
    return items;
  });

/** Playwright's screenshots are Node Buffers (the project has no Node types). */
const base64 = (png: Uint8Array) =>
  (png as unknown as { toString(e: "base64"): string }).toString("base64");

/** Compares the two shots in a blank page (a canvas decodes them) and returns each element's ratio. */
const measure = (page: Page, shown: Uint8Array, hidden: Uint8Array, items: Item[]) =>
  page.evaluate(
    async ({ a, b, items }) => {
      const pixels = async (src: string) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d")!;
        g.drawImage(img, 0, 0);
        return { data: g.getImageData(0, 0, img.width, img.height).data, w: img.width };
      };
      const [A, B] = await Promise.all([pixels(a), pixels(b)]);
      const lum = (r: number, g: number, bl: number) => {
        const f = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
      };
      // The ground, averaged over 8px blocks (for thin text only): noise evens out, gradients and shapes still count.
      const block = (i: number, j: number) => {
        const [bi, bj] = [i - (i % 8), j - (j % 8)];
        let [r, g, b, n] = [0, 0, 0, 0];
        for (let v = bj; v < bj + 8; v++)
          for (let u = bi; u < bi + 8; u++) {
            const k = (v * B.w + u) * 4;
            if (B.data[k] === undefined) continue;
            r += B.data[k]!;
            g += B.data[k + 1]!;
            b += B.data[k + 2]!;
            n++;
          }
        return [r / n, g / n, b / n];
      };
      return items.map(({ name, x, y, w, h, large, outlined, fill, alpha }) => {
        if (outlined)
          return {
            name,
            ratio: Math.round(outlined * 100) / 100,
            needs: large ? 3 : 4.5,
            pixels: 999,
          };
        // The letters: where the two shots differ.
        const at: [number, number, number][] = [];
        for (let j = y; j < y + h; j++)
          for (let i = x; i < x + w; i++) {
            const k = (j * A.w + i) * 4;
            const d =
              Math.abs(A.data[k]! - B.data[k]!) +
              Math.abs(A.data[k + 1]! - B.data[k + 1]!) +
              Math.abs(A.data[k + 2]! - B.data[k + 2]!);
            if (d > 48) at.push([k, i, j]);
          }
        // Their solid insides (letter pixels whose neighbours are letter pixels too, not the soft edges): there the
        // rendered letter and what's behind it are compared pixel by pixel, so whatever lies over both (a print
        // grain) or blends them (opacity, a gradient fill) counts the way a viewer sees it.
        const inLetters = new Set(at.map(([, i, j]) => j * A.w + i));
        const inside = at.filter(([, i, j]) =>
          [-1, 0, 1].every((v) => [-1, 0, 1].every((u) => inLetters.has((j + v) * A.w + i + u))),
        );
        const ratios = (
          inside.length >= 20
            ? inside.map(([k]) => [
                lum(A.data[k]!, A.data[k + 1]!, A.data[k + 2]!),
                lum(B.data[k]!, B.data[k + 1]!, B.data[k + 2]!),
              ])
            : // Text too thin to have solid insides: its own color (blended by its opacity) on the ground behind it.
              at.map(([, i, j]) => {
                const ground = block(i, j);
                const color = (fill ?? ground).map((c, n) => c * alpha + ground[n]! * (1 - alpha));
                return [
                  lum(color[0]!, color[1]!, color[2]!),
                  lum(ground[0]!, ground[1]!, ground[2]!),
                ];
              })
        )
          .map(([fg, bg]) => (Math.max(fg!, bg!) + 0.05) / (Math.min(fg!, bg!) + 0.05))
          .sort((p, q) => p - q);
        const ratio = ratios[Math.floor(ratios.length * 0.1)] ?? 21;
        return {
          name,
          ratio: Math.round(ratio * 100) / 100,
          needs: large ? 3 : 4.5,
          pixels: at.length,
        };
      });
    },
    {
      a: `data:image/png;base64,${base64(shown)}`,
      b: `data:image/png;base64,${base64(hidden)}`,
      items,
    },
  );

test.describe.configure({ mode: "parallel" });

for (const id of themeIds)
  test(`${id}: every text on its Starting Soon scene meets WCAG AA contrast as rendered`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(scene(id));
    await expect(page.locator(".scene-title")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    // Glows (text-shadow) are off in both shots: they only add a halo around letters measured against the ground.
    await page.addStyleTag({ content: `.scene, .scene * { text-shadow: none !important; }` });
    const items = await textItems(page);
    const shown = await page.screenshot();
    await page.addStyleTag({
      content: `.scene, .scene * { -webkit-text-fill-color: transparent !important; }
        .scene .scene-word { background: none !important; }`,
    });
    const hidden = await page.screenshot();
    const blank = await browser.newPage();
    const results: Result[] = await measure(blank, shown, hidden, items);
    await blank.close();
    const measured = results.filter((r) => r.pixels >= 30);
    expect(measured.length, "found the scene's text").toBeGreaterThan(3);
    const failing = measured
      .filter((r) => r.ratio < r.needs)
      .map((r) => `${r.name}: ${r.ratio}:1, needs ${r.needs}:1`);
    expect(failing).toEqual([]);
  });
