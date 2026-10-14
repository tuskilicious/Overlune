import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";

// The canvas (T9.4): Customize, then select, drag, snap, resize, turn, nudge and undo.

test.use({ viewport: { width: 1440, height: 900 } });

const editorWith = (settings: unknown) =>
  `/editor#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;

/** The starting scene's layout as the editor's link holds it now. */
const layoutInLink = (page: Page) =>
  page.evaluate(() => {
    const hash = location.hash.slice(1);
    // The editor's own decoder, from the dev server.
    return import("/src/settings/url.ts" as string).then(
      (m: {
        decode: (h: string) => {
          settings: {
            layouts: {
              landscape?: {
                scenes: {
                  starting?: {
                    id: string;
                    type: string;
                    x: number;
                    y: number;
                    w: number;
                    h: number;
                    r: number;
                  }[];
                };
              };
            };
          };
        };
      }) => m.decode(hash).settings.layouts.landscape?.scenes.starting ?? null,
    );
  });

const canvasPoint = async (page: Page, x: number, y: number) => {
  const r = (await page.locator(".canvas").boundingBox())!;
  const scale = r.width / 1920;
  return { x: r.x + x * scale, y: r.y + y * scale, scale };
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    editorWith({
      theme: "clean-slate",
      starting: { subtitle: "Chill games", endsAt: Date.now() + 9e7, tz: "UTC" },
      socials: [{ platform: "twitch", handle: "yourname" }],
    }),
  );
  await page.getByRole("button", { name: "Customize" }).click();
  await expect(page.locator(".canvas")).toBeVisible();
});

test("Customize turns the preview into a canvas with the look's own layout, then Done returns", async ({
  page,
}) => {
  // The scene is scaled into the canvas, not drawn at full size behind it.
  const canvas = (await page.locator(".canvas").boundingBox())!;
  const shown = (await page.locator(".canvas .scene").boundingBox())!;
  expect(Math.abs(shown.width - canvas.width)).toBeLessThan(4);
  const layout = (await layoutInLink(page))!;
  expect(layout.map((e) => e.type)).toEqual(expect.arrayContaining(["title", "subtitle"]));
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".canvas")).toHaveCount(0);
  // The layout stays in the link; the preview shows it.
  expect(await layoutInLink(page)).toEqual(layout);
});

test("dragging an element moves it, as one undo step", async ({ page }) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const from = await canvasPoint(page, title.x + 40, title.y + title.h / 2);
  await page.keyboard.down("Alt"); // no snapping, so the move is exact
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 50, from.y - 60, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const moved = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  expect(Math.abs(moved.x - title.x - 50 / from.scale)).toBeLessThan(10);
  expect(moved.y).toBeLessThan(title.y);
  await page.keyboard.press("Control+z");
  expect((await layoutInLink(page))!.find((e) => e.type === "title")).toEqual(title);
});

test("dragging near another line snaps to it, with a guide, and lines the box up with it", async ({
  page,
}) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const from = await canvasPoint(page, title.x + 20, title.y + 20);
  const nearCentre = 960 - title.w / 2 + 3; // 3px off the canvas's centre
  const to = await canvasPoint(page, nearCentre + 20, title.y + 20);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  const guide = page.locator('.canvas-guide[data-axis="x"]');
  await expect(guide).toBeVisible();
  // The line it snapped to, in canvas px: the closest one, the canvas's centre or another element's.
  const at = parseFloat(await guide.evaluate((g) => (g as HTMLElement).style.left)) / to.scale;
  await page.mouse.up();
  await expect(page.locator(".canvas-guide")).toHaveCount(0);
  const snapped = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const lines = [snapped.x, snapped.x + snapped.w / 2, snapped.x + snapped.w];
  expect(Math.min(...lines.map((l) => Math.abs(l - at)))).toBeLessThanOrEqual(1);
});

test("a corner handle resizes, and the turning handle turns", async ({ page }) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const inside = await canvasPoint(page, title.x + 20, title.y + 20);
  await page.mouse.click(inside.x, inside.y);
  const se = (await page.locator('.canvas-handle[data-handle="se"]').boundingBox())!;
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await page.mouse.down();
  await page.mouse.move(se.x + 40, se.y + 30, { steps: 5 });
  await page.mouse.up();
  const bigger = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  expect(bigger.w).toBeGreaterThan(title.w);
  expect(bigger.h).toBeGreaterThan(title.h);
  expect([bigger.x, bigger.y]).toEqual([title.x, title.y]);

  const knob = (await page.locator(".canvas-rotate").boundingBox())!;
  const centre = await canvasPoint(page, bigger.x + bigger.w / 2, bigger.y + bigger.h / 2);
  await page.mouse.move(knob.x + 5, knob.y + 5);
  await page.mouse.down();
  await page.mouse.move(centre.x + 200, centre.y, { steps: 6 }); // straight to the right: 90°
  await page.mouse.up();
  expect((await layoutInLink(page))!.find((e) => e.type === "title")!.r).toBe(90);
});

test("by keyboard: Tab picks an element, arrows nudge it, Shift moves 10, Alt resizes", async ({
  page,
}) => {
  const first = (await layoutInLink(page))![0]!;
  await page.locator(".canvas").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".canvas-selection")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Alt+ArrowRight");
  const now = (await layoutInLink(page))![0]!;
  expect([now.x, now.y, now.w]).toEqual([first.x + 1, first.y + 10, first.w + 1]);
  await expect(page.getByRole("status").filter({ hasText: "selected, at" })).toContainText(
    `at ${now.x}, ${now.y}`,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".canvas-selection")).toHaveCount(0);
});

test.describe("layers and inspector (T9.5)", () => {
  const layers = (page: Page) => page.getByRole("region", { name: "Layers" });
  const inspector = (page: Page) => page.locator(".canvas-inspector");

  test("Layers lists every element top first, and picks one for the inspector", async ({
    page,
  }) => {
    const layout = (await layoutInLink(page))!;
    await expect(layers(page).locator("li")).toHaveCount(layout.length);
    await layers(page).getByRole("button", { name: "Title", exact: true }).click();
    await expect(page.locator(".canvas-selection")).toHaveCount(1);
    await expect(inspector(page).getByRole("heading")).toHaveText("Inspector: Title");
  });

  test("the inspector moves, sizes, turns, renames and restyles; each shows in the link", async ({
    page,
  }) => {
    await layers(page).getByRole("button", { name: "Title", exact: true }).click();
    const panel = inspector(page);
    await panel.getByLabel("X", { exact: true }).fill("300");
    await panel.getByLabel("Turn (°)").fill("15");
    await panel.getByLabel("Name in Layers").fill("Big headline");
    await panel.getByRole("combobox", { name: /^Color/ }).selectOption("accent");
    const title = (await layoutInLink(page))!.find((e) => e.type === "title") as unknown as Record<
      string,
      unknown
    >;
    expect(title).toMatchObject({ x: 300, r: 15, name: "Big headline", color: "accent" });
    await expect(
      layers(page).getByRole("button", { name: "Big headline", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".canvas .scene-title")).toHaveCSS("rotate", "15deg");
  });

  test("hide, lock and layer order from the panel", async ({ page }) => {
    await layers(page).getByRole("button", { name: "Hide Subtitle" }).click();
    await expect(page.locator(".canvas .scene-subtitle")).toBeHidden();
    await layers(page).getByRole("button", { name: "Lock Title" }).click();
    expect((await layoutInLink(page))!.find((e) => e.type === "title")!).toMatchObject({
      locked: true,
    });
    // A locked element has no handles, and dragging it doesn't move it.
    await layers(page).getByRole("button", { name: "Title", exact: true }).click();
    await expect(page.locator(".canvas-handle")).toHaveCount(0);

    const order = async () => (await layoutInLink(page))!.map((e) => e.type);
    const before = await order();
    const lowest = before[0]!;
    const name = lowest[0]!.toUpperCase() + lowest.slice(1);
    await layers(page)
      .getByRole("button", { name: `Move ${name} up a layer` })
      .click();
    expect((await order())[1]).toBe(lowest);
  });

  test("[ and ] move the selection down and up a layer", async ({ page }) => {
    const before = (await layoutInLink(page))!.map((e) => e.id);
    await page.locator(".canvas").focus();
    await page.keyboard.press("Tab"); // the bottom layer
    await page.keyboard.press("]");
    expect((await layoutInLink(page))!.map((e) => e.id)[1]).toBe(before[0]);
    await page.keyboard.press("[");
    expect((await layoutInLink(page))!.map((e) => e.id)).toEqual(before);
  });

  test("the editor stays accessible with the canvas and panels open", async ({ page }) => {
    await layers(page).getByRole("button", { name: "Title", exact: true }).click();
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
});

test.describe("adding and removing (T9.6)", () => {
  const layers = (page: Page) => page.getByRole("region", { name: "Layers" });
  const types = async (page: Page) => (await layoutInLink(page))!.map((e) => e.type);
  /** An Add button, not a layer of the same name. */
  const adder = (page: Page, name: string) =>
    layers(page).getByRole("group", { name: "Add" }).getByRole("button", { name, exact: true });

  test("adds text and a shape in the middle, selected, and edits the new text", async ({
    page,
  }) => {
    await adder(page, "Text").click();
    const text = (await layoutInLink(page))!.at(-1)!;
    expect(text.type).toBe("text");
    expect(text.x + text.w / 2).toBe(960);
    await expect(page.locator(".canvas .layout-text")).toHaveText("Your text");
    await page.locator(".canvas-inspector").getByLabel("Words").fill("Raffle at 9 PM");
    await expect(page.locator(".canvas .layout-text")).toHaveText("Raffle at 9 PM");
    await adder(page, "Shape").click();
    expect((await types(page)).slice(-2)).toEqual(["text", "shape"]);
  });

  test("a picture needs an https link first", async ({ page }) => {
    await layers(page).getByRole("button", { name: "Picture" }).click();
    const field = page.getByLabel("Picture link (https)");
    await field.fill("http://example.com/logo.png");
    await page.getByRole("button", { name: "Add picture" }).click();
    await expect(page.getByText("Pictures need a link that starts with https://")).toBeVisible();
    expect(await types(page)).not.toContain("image");
    await page.route("https://example.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "image/png", body: "" }),
    );
    await field.fill("https://example.com/logo.png");
    await page.getByRole("button", { name: "Add picture" }).click();
    expect(await types(page)).toContain("image");
  });

  test("Delete removes; a scene part can be put back where the look puts it", async ({ page }) => {
    const subtitle = (await layoutInLink(page))!.find((e) => e.type === "subtitle")!;
    await layers(page).getByRole("button", { name: "Subtitle", exact: true }).click();
    await page.locator(".canvas").focus();
    await page.keyboard.press("Delete");
    expect(await types(page)).not.toContain("subtitle");
    await expect(page.locator(".canvas .scene-subtitle")).toBeHidden();
    await layers(page).getByRole("button", { name: "Put back the Subtitle" }).click();
    const back = (await layoutInLink(page))!.find((e) => e.type === "subtitle")!;
    expect([back.x, back.y, back.w, back.h]).toEqual([
      subtitle.x,
      subtitle.y,
      subtitle.w,
      subtitle.h,
    ]);
  });

  test("Duplicate copies added elements 24px over; Ctrl+D does too", async ({ page }) => {
    await adder(page, "Shape").click();
    const shape = (await layoutInLink(page))!.at(-1)!;
    await page.locator(".canvas-inspector").getByRole("button", { name: "Duplicate" }).click();
    const copy = (await layoutInLink(page))!.at(-1)!;
    expect([copy.type, copy.x, copy.y]).toEqual(["shape", shape.x + 24, shape.y + 24]);
    await page.locator(".canvas").focus();
    await page.keyboard.press("Control+d");
    expect((await types(page)).filter((t) => t === "shape")).toHaveLength(3);
    // The scene's own parts appear once: no Duplicate for them.
    await layers(page).getByRole("button", { name: "Title", exact: true }).click();
    await expect(
      page.locator(".canvas-inspector").getByRole("button", { name: "Duplicate" }),
    ).toHaveCount(0);
  });

  test("at 40 elements adding stops, and says why", async ({ page }) => {
    const add = adder(page, "Shape");
    for (let n = (await types(page)).length; n < 40; n++) await add.click();
    expect(await types(page)).toHaveLength(40);
    await expect(layers(page).getByText("A scene holds 40 elements at most.")).toBeVisible();
    await expect(add).toHaveCount(0);
  });
});

test.describe("the overlay playbook (2.1)", () => {
  test("a drag stops at the canvas's edge, and so do the arrow keys", async ({ page }) => {
    const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
    const from = await canvasPoint(page, title.x + 40, title.y + title.h / 2);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 2000, from.y + 2000, { steps: 6 });
    await page.mouse.up();
    const moved = (await layoutInLink(page))!.find((e) => e.type === "title")!;
    expect(moved.x).toBe(0);
    expect(moved.y + moved.h).toBe(1080);
    await page.keyboard.press("Shift+ArrowLeft");
    await page.keyboard.press("Shift+ArrowDown");
    expect((await layoutInLink(page))!.find((e) => e.type === "title")).toMatchObject({
      x: 0,
      y: moved.y,
    });
  });

  test("safe areas and thirds show on request", async ({ page }) => {
    await expect(page.locator(".canvas-frame-guides")).toHaveCount(0);
    await page.getByLabel("Show safe areas and thirds").check();
    await expect(page.locator(".canvas .canvas-safe")).toHaveCount(2);
    await expect(page.locator(".canvas .canvas-third")).toHaveCount(4);
    const canvas = (await page.locator(".canvas").boundingBox())!;
    const action = (await page.locator('.canvas-safe[data-safe="action"]').boundingBox())!;
    expect(action.x - canvas.x).toBeCloseTo(canvas.width * 0.05, 0);
  });
});
