import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type WebSocketRoute,
} from "@playwright/test";

// Saved overlays in the editor (T12.5). The dev server has no API, so these answer /api as the Worker does, with an
// in-memory account (the routes themselves are tested in tests/functions/), and play each overlay's live channel.

const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

type Row = { id: string; name: string; draft: string; published: string | null; version: number };

/** A signed-in account with `limit` slots, served to every page of the context; returns its overlays and the
 *  requests made. Publishing sends the new settings to every open copy of that overlay, as the channel does. */
async function account(context: BrowserContext, { limit = 10, rows = [] as Row[] } = {}) {
  const calls: string[] = [];
  const sockets = new Map<string, Set<WebSocketRoute>>();
  let n = 0;
  await context.routeWebSocket(/\/api\/live\//, (ws) => {
    const id = new URL(ws.url()).pathname.split("/").pop()!;
    const open = sockets.get(id) ?? new Set();
    sockets.set(id, open.add(ws));
    ws.onClose(() => open.delete(ws));
    const row = rows.find((r) => r.id === id);
    if (row?.published) ws.send(JSON.stringify({ version: row.version, settings: row.published }));
  });
  await context.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    calls.push(`${method} ${path}`);
    const body = req.postData() ? (JSON.parse(req.postData()!) as Partial<Row>) : {};
    const [, , , id, action] = path.split("/");
    const row = rows.find((r) => r.id === id);
    const summary = (r: Row) => ({ id: r.id, name: r.name, version: r.version });
    if (path === "/api/me")
      return route.fulfill(json(200, { login: "moon", displayName: "Moon", avatarUrl: null }));
    if (path === "/api/overlays" && method === "GET")
      return route.fulfill(json(200, { overlays: rows.map(summary), limit }));
    if (path === "/api/overlays" && method === "POST") {
      if (rows.length >= limit)
        return route.fulfill(
          json(409, {
            error: "limit",
            message: `You can save up to ${limit} overlays. Delete one to save a new one.`,
          }),
        );
      const r: Row = {
        id: `id${++n}`.padEnd(22, "x"),
        name: body.name!,
        draft: (body as { settings: string }).settings,
        published: null,
        version: 0,
      };
      rows.unshift(r);
      return route.fulfill(json(201, summary(r)));
    }
    if (!row) return route.fulfill(json(404, { error: "not found" }));
    if (action === "publish") {
      row.published = row.draft;
      row.version++;
      for (const ws of sockets.get(row.id) ?? [])
        ws.send(JSON.stringify({ version: row.version, settings: row.published }));
      return route.fulfill(json(200, summary(row)));
    }
    if (method === "GET") return route.fulfill(json(200, row));
    if (method === "PATCH") {
      const b = body as { name?: string; settings?: string };
      if (b.name) row.name = b.name;
      if (b.settings) row.draft = b.settings;
      return route.fulfill(json(200, summary(row)));
    }
    if (method === "DELETE") {
      rows.splice(rows.indexOf(row), 1);
      for (const ws of sockets.get(row.id) ?? []) ws.send(JSON.stringify({ deleted: true }));
      return route.fulfill({ status: 204 });
    }
    return route.fulfill(json(405, {}));
  });
  return { rows, calls };
}

const panel = (page: Page) => page.getByRole("group", { name: "Your saved overlays" });
const title = (page: Page) => page.getByLabel("Title", { exact: true });
/** The Starting Soon link, as copied. */
const startingLink = (page: Page) =>
  page.getByRole("listitem").filter({ hasText: "Starting Soon" }).getByRole("textbox").inputValue();

test("signed out or without the API, the editor has no saved overlays", async ({ page }) => {
  await page.goto("/editor?look=rain-city");
  await expect(page.locator("#obs-links")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(panel(page)).toHaveCount(0);
  expect(await startingLink(page)).not.toContain("live=");
});

test("save, Update OBS reaching an open overlay, rename, open and delete", async ({
  context,
  page,
}) => {
  const { rows } = await account(context);
  await page.goto("/editor?look=rain-city");
  await title(page).fill("First title");
  await expect(panel(page)).toContainText("0 of 10 saved");

  // Save: by keyboard, from the name field.
  await panel(page).getByLabel("Name", { exact: true }).fill("Main stream");
  await panel(page).getByLabel("Name", { exact: true }).press("Enter");
  await expect(panel(page).getByRole("status")).toContainText("Saved as “Main stream”");
  await expect(panel(page)).toContainText("1 of 10 saved");
  await expect(panel(page)).toContainText("OBS is up to date");
  const update = panel(page).getByRole("button", { name: "Update OBS" });
  await expect(update).toBeDisabled();
  expect(rows[0]!.published).not.toBeNull();

  // Its links are its own, and an open copy follows Update OBS.
  const link = await startingLink(page);
  expect(link).toContain(`live=${rows[0]!.id}`);
  const obs = await context.newPage();
  await obs.goto(link);
  await expect(obs.locator(".scene-title")).toHaveText("First title");
  await title(page).fill("Second title");
  await expect(panel(page)).toContainText("Changes not in OBS yet");
  // The link doesn't change while editing, so the copy in OBS isn't stale.
  expect(await startingLink(page)).toBe(link);
  await update.click();
  await expect(obs.locator(".scene-title")).toHaveText("Second title");
  await expect(panel(page)).toContainText("OBS is up to date");
  await expect(update).toBeDisabled();

  const scan = await new AxeBuilder({ page })
    .include("#obs-links")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  // Rename, by keyboard.
  await panel(page).getByRole("button", { name: "Rename Main stream" }).click();
  const newName = panel(page).getByLabel("New name for Main stream");
  await expect(newName).toBeFocused();
  await newName.fill("Weekend stream");
  await newName.press("Enter");
  await expect(panel(page)).toContainText("Editing Weekend stream");
  expect(rows[0]!.name).toBe("Weekend stream");

  // Stop editing it, change things, then open it again: its settings come back.
  await panel(page).getByRole("button", { name: "Stop editing it" }).click();
  expect(await startingLink(page)).not.toContain("live=");
  await title(page).fill("Something else");
  await panel(page).getByRole("button", { name: "Open Weekend stream" }).click();
  await expect(title(page)).toHaveValue("Second title");
  await expect(panel(page)).toContainText("OBS is up to date");

  // Delete asks first; Keep it changes nothing.
  await panel(page).getByRole("button", { name: "Delete Weekend stream" }).click();
  await panel(page).getByRole("button", { name: "Keep it" }).click();
  expect(rows).toHaveLength(1);
  await panel(page).getByRole("button", { name: "Delete Weekend stream" }).click();
  await panel(page).getByRole("button", { name: "Delete it" }).click();
  await expect(panel(page)).toContainText("0 of 10 saved");
  expect(rows).toHaveLength(0);
  expect(await startingLink(page)).not.toContain("live=");
  // The overlay in OBS keeps what it showed.
  await expect(obs.locator(".scene-title")).toHaveText("Second title");
});

test("at the limit, saving is off and says what to do", async ({ context, page }) => {
  const rows: Row[] = [1, 2].map((i) => ({
    id: `full${i}`.padEnd(22, "x"),
    name: `Overlay ${i}`,
    draft: "1.x",
    published: null,
    version: 0,
  }));
  await account(context, { limit: 2, rows });
  // In the site's light mode, for its contrast (the dark one is scanned above).
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/editor?look=rain-city");
  await expect(panel(page)).toContainText("2 of 2 saved");
  await expect(panel(page)).toContainText("Delete one below to save a new one.");
  await expect(panel(page).getByRole("button", { name: "Save to my account" })).toBeDisabled();
  await expect(panel(page).getByLabel("Name", { exact: true })).toBeDisabled();
  await panel(page).getByRole("button", { name: "Delete Overlay 1" }).click();
  const scan = await new AxeBuilder({ page })
    .include("#obs-links")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("a reload keeps editing the same saved overlay, with its changes still shown as not in OBS", async ({
  context,
  page,
}) => {
  await account(context);
  await page.goto("/editor?look=rain-city");
  await panel(page).getByLabel("Name", { exact: true }).fill("Reloaded");
  await panel(page).getByRole("button", { name: "Save to my account" }).click();
  await expect(panel(page)).toContainText("Editing Reloaded");
  await title(page).fill("Not sent yet");
  await page.reload();
  await expect(panel(page)).toContainText("Editing Reloaded");
  await expect(panel(page)).toContainText("Changes not in OBS yet");
});
