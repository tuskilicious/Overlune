// Local design tool: a contact sheet of the shots from shots.mjs. Usage: node tests/sheet.mjs <dir> [cols]
import { chromium } from "@playwright/test";
import { readdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [dir, cols = "4"] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".png") && f !== "sheet.png");
const cells = files
  .map((f) => `<figure><img src="${f}"><figcaption>${f.replace(".png", "")}</figcaption></figure>`)
  .join("");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
writeFileSync(
  `${dir}/sheet.html`,
  `<style>body{margin:0;background:#222;color:#eee;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px}
  figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 0}</style>${cells}`,
);
await page.goto(pathToFileURL(`${dir}/sheet.html`).href);
await page.waitForLoadState("load");
await page.screenshot({ path: `${dir}/sheet.png`, fullPage: true });
await browser.close();
