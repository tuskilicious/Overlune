// Local design tool, not a test: screenshots every look's scene for before/after layout comparison.
// Usage: node tests/shots.mjs <out-dir> [scene] [scale]   (needs the dev server on :5173)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import lz from "lz-string";

const [out = "shots", scene = "starting", scale = "0.5"] = process.argv.slice(2);
const ids = [
  "clean-slate",
  "neon-grid",
  "cozy-cafe",
  "arcade-8bit",
  "pastel-cloud",
  "forest-night",
  "bold-esports",
  "vaporwave-sunset",
  "daylight",
  "abyss",
  "session",
  "shonen",
  "sakura",
  "skate-deck",
  "phosphor",
  "quest",
];
const only = process.env.LOOKS?.split(",");
const endsAt = Date.now() + 26 * 3_600_000;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: Number(scale),
});
await page.route("https://logos.example/logo.png", (r) =>
  r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
);
for (const id of only ?? ids) {
  const s = {
    theme: id,
    logo: "",
    starting: { subtitle: "Chill games and good chat", endsAt, tz: "UTC" },
    brb: { subtitle: "Grabbing a drink" },
    ending: { subtitle: "See you next stream" },
    socials: [
      { platform: "twitch", handle: "Maya_plays" },
      { platform: "youtube", handle: "Maya_plays" },
    ],
    ticker: {
      show: process.env.TICKER === "1",
      label: "Live",
      extra: "Streams Tue, Thu, Sat at 8 pm",
    },
  };
  // LONG=1: the longest allowed text, three socials and a logo (as in scene-fit.spec.ts).
  if (process.env.LONG === "1") {
    s.logo = "https://logos.example/logo.png";
    s.starting.title = "Starting very soon, grab a snack and get comfy for the strea";
    s.starting.subtitle =
      "Tonight: ranked grind until we hit diamond, plus viewer games after. Drop a follow if you are new around here!!";
    s.socials.push({ platform: "x", handle: "somestreamer" });
  }
  await page.goto(
    `http://localhost:5173/o/${scene}?rm=1#1.${lz.compressToEncodedURIComponent(JSON.stringify(s))}`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${id}.png` });
}
await browser.close();
console.log(`saved ${(only ?? ids).length} to ${out}`);
