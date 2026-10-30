import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import lz from "lz-string";

// A saved overlay's link (T12.4): `live=<id>` before the #, the settings as a snapshot after it. The test plays the
// live channel (the real one runs in workerd, tests/functions/live.test.ts).

const id = "Hw5ucSZNL_kWDPlm8McCsA";
/** Settings in the link's form, written out here so the test pins the public link shape (STACK.md). */
const titled = (title: string) =>
  `1.${lz.compressToEncodedURIComponent(JSON.stringify({ starting: { title } }))}`;
const link = (title: string) => `/o/starting?live=${id}#${titled(title)}`;

/** Plays the channel: every connection the overlays open (in development React opens and closes one extra, so tests
 *  count the open ones, or the ones made after a point), and what to do with each. */
async function channel(page: Page, onConnect: (ws: WebSocketRoute) => void = () => {}) {
  const connections: WebSocketRoute[] = [];
  const open = new Set<WebSocketRoute>();
  await page.routeWebSocket(`**/api/live/${id}`, (ws) => {
    connections.push(ws);
    open.add(ws);
    ws.onClose(() => open.delete(ws));
    onConnect(ws);
  });
  return { connections, open };
}
const publish = (ws: WebSocketRoute, version: number, title: string) =>
  ws.send(JSON.stringify({ version, settings: titled(title) }));

test("two open copies show the snapshot at once, then each Update OBS in place", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const [one, two] = [await context.newPage(), await context.newPage()];
  const both = [one, two];
  const channels: Awaited<ReturnType<typeof channel>>[] = [];
  for (const page of both) {
    channels.push(await channel(page));
    await page.goto(link("From the link"));
    await expect(page.locator(".scene-title")).toHaveText("From the link");
  }
  await expect.poll(() => channels.map((c) => c.open.size)).toEqual([1, 1]);
  const sockets = channels.flatMap((c) => [...c.open]);
  const start = Date.now();
  for (const ws of sockets) publish(ws, 1, "Updated live");
  for (const page of both) await expect(page.locator(".scene-title")).toHaveText("Updated live");
  expect(Date.now() - start).toBeLessThan(2000);
  // An older or repeated version changes nothing.
  for (const ws of sockets) publish(ws, 1, "Stale");
  await one.waitForTimeout(300);
  for (const page of both) await expect(page.locator(".scene-title")).toHaveText("Updated live");
  await context.close();
});

test("with the channel out of reach, the snapshot stays, with no error on stream, and it keeps trying", async ({
  page,
}) => {
  const { connections } = await channel(page, (ws) => ws.close());
  await page.goto(link("Still here"));
  await expect.poll(() => connections.length, { timeout: 5000 }).toBeGreaterThanOrEqual(3);
  await expect(page.locator(".scene-title")).toHaveText("Still here");
  await expect(page.locator(".overlay-error")).toHaveCount(0);
});

test("a deleted overlay keeps what it shows and stops listening", async ({ page }) => {
  const { connections, open } = await channel(page, (ws) => publish(ws, 4, "Last published"));
  await page.goto(link("Snapshot"));
  await expect(page.locator(".scene-title")).toHaveText("Last published");
  await expect.poll(() => open.size).toBe(1);
  const made = connections.length;
  for (const ws of open) ws.send(JSON.stringify({ deleted: true }));
  await expect.poll(() => open.size).toBe(0);
  await page.waitForTimeout(2500);
  expect(connections).toHaveLength(made);
  await expect(page.locator(".scene-title")).toHaveText("Last published");
  await expect(page.locator(".overlay-error")).toHaveCount(0);
});

test("an overlay already gone (404) is tried once, then left on its snapshot", async ({ page }) => {
  let asked = 0;
  await page.route(`**/api/live/${id}`, (route) => {
    asked++;
    return route.fulfill({ status: 404, body: '{"error":"not found"}' });
  });
  const { connections } = await channel(page, (ws) => ws.close());
  await page.goto(link("Snapshot"));
  await expect.poll(() => asked).toBeGreaterThanOrEqual(1);
  const made = connections.length;
  await page.waitForTimeout(2500);
  expect(connections).toHaveLength(made);
  await expect(page.locator(".scene-title")).toHaveText("Snapshot");
});

test("a link without live= never opens a connection", async ({ page }) => {
  const { connections } = await channel(page);
  await page.goto(`/o/starting#${titled("Plain link")}`);
  await expect(page.locator(".scene-title")).toHaveText("Plain link");
  await page.waitForTimeout(500);
  expect(connections).toHaveLength(0);
});
