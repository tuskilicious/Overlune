import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { fakeTwitch } from "./fake-twitch";

// The Live overlay (T9.7): chat, alerts and the webcam frame in one browser source.

test.use({ viewport: { width: 1920, height: 1080 } });

const hash = (settings: unknown) =>
  `#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;
const box = async (page: Page, selector: string) => {
  const b = (await page.locator(selector).boundingBox())!;
  return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
};

test("before it's customized, Live has chat, alerts and the frame in their default places", async ({
  page,
}) => {
  await fakeTwitch(page);
  await page.goto(`/o/live${hash({ theme: "neon-grid", chat: { channel: "dallas" } })}`);
  await expect(page.locator(".live")).toHaveAttribute("data-theme", "neon-grid");
  expect(await box(page, ".layout-el-chat")).toEqual([1456, 120, 400, 600]);
  expect(await box(page, ".layout-el-frame")).toEqual([64, 656, 640, 360]);
  await expect(page.locator(".layout-el-chat .chat")).toBeAttached();
  await expect(page.locator(".layout-el-frame .frame")).toBeVisible();
});

test("a customized Live puts each part in its box, and a test alert lands in the alerts box", async ({
  page,
}) => {
  await fakeTwitch(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const live = [
    { id: "c", type: "chat", x: 40, y: 40, w: 420, h: 700 },
    { id: "a", type: "alerts", x: 700, y: 700, w: 1100, h: 300 },
    { id: "t", type: "text", x: 700, y: 40, w: 600, h: 80, text: "!discord for the server" },
  ];
  await page.goto(
    `/o/live?test=1${hash({ chat: { channel: "dallas" }, layouts: { landscape: { scenes: { live } } } })}`,
  );
  expect(await box(page, ".layout-el-chat")).toEqual([40, 40, 420, 700]);
  await expect(page.locator(".layout-el-frame")).toHaveCount(0); // left out of the layout
  await expect(page.locator('[data-id="t"]')).toHaveText("!discord for the server");
  const alert = page.locator(".layout-el-alerts .alert-box");
  await expect(alert).toBeVisible();
  const a = (await alert.boundingBox())!;
  expect(a.x).toBeGreaterThanOrEqual(700);
  expect(a.y).toBeGreaterThanOrEqual(700);
  expect(a.x + a.width).toBeLessThanOrEqual(1800);
});

test.describe("in the editor", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Live source shows Live with sample chat, and Customize edits its own layout", async ({
    page,
  }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    await page.getByRole("button", { name: "Live source" }).click();
    await expect(page.getByRole("heading", { name: "Preview: Live" })).toBeVisible();
    await expect(page.locator(".editor-pick .live .chat-msg").first()).toBeVisible();
    await page.getByRole("button", { name: "Customize" }).click();
    const layers = page.getByRole("region", { name: "Layers" });
    await expect(layers.getByRole("button", { name: "Chat", exact: true })).toBeVisible();
    // Delete the chat, then put it back in its default place.
    await layers.getByRole("button", { name: "Chat", exact: true }).click();
    await page.locator(".canvas").focus();
    await page.keyboard.press("Delete");
    await expect(layers.getByRole("button", { name: "Chat", exact: true })).toHaveCount(0);
    await layers.getByRole("button", { name: "Put back the Chat" }).click();
    await expect(layers.getByRole("button", { name: "Chat", exact: true })).toBeVisible();
    // The scenes keep their own layouts: Live's edits don't touch Starting Soon.
    await page.getByRole("button", { name: "Live source" }).click();
    await expect(page.getByRole("heading", { name: "Preview: Starting Soon" })).toBeVisible();
    await expect(page.locator(".editor-pick .scene[data-layout]")).toHaveCount(0);
  });

  test("the links include Live, as an extra", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    const row = page.locator(".editor-link", { has: page.getByText("Live", { exact: true }) });
    await expect(row).toContainText("(optional)");
    expect(await row.locator("input").inputValue()).toContain("/o/live#1.");
  });
});
