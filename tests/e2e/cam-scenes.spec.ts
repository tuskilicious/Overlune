import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";

// Just Chatting and Reaction (T10.3): the look around the camera, with holes the camera and the video show through.

test.use({ viewport: { width: 1920, height: 1080 } });

const hash = (settings: unknown) =>
  `#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;
const box = async (page: Page, selector: string) => {
  const b = (await page.locator(selector).boundingBox())!;
  return [b.x, b.y, b.width, b.height].map(Math.round);
};
/** The scene's mask, as positioned holes then the whole box (CamScene's `holes`). */
const mask = (page: Page) =>
  page.locator(".scene").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { size: cs.maskSize, position: cs.maskPosition, composite: cs.maskComposite };
  });

test("Just Chatting shows the look with its header and topic, and a hole for the camera", async ({
  page,
}) => {
  await page.goto(
    `/o/chatting${hash({ theme: "neon-grid", chatting: { title: "Coffee chat", subtitle: "Your desk setups" } })}`,
  );
  const scene = page.locator(".scene.cam-scene");
  await expect(scene).toHaveAttribute("data-theme", "neon-grid");
  await expect(page.locator(".layout-el-title")).toHaveText("Coffee chat");
  await expect(page.locator(".layout-el-subtitle")).toHaveText("Talking aboutYour desk setups");
  expect(await box(page, ".layout-el-camera")).toEqual([64, 180, 1280, 720]);
  // The hole is the camera box inside its frame's edge (28px at this size), so the edge stays drawn.
  expect(await mask(page)).toEqual({
    size: "1224px 664px, 1920px 1080px",
    position: "92px 208px, 0px 0px",
    composite: "exclude, exclude",
  });
});

test("Reaction has a hole for the video and one for the camera, and chat", async ({ page }) => {
  await page.goto(`/o/reaction${hash({ theme: "cozy-cafe", chat: { channel: "dallas" } })}`);
  await expect(page.locator(".layout-el-title")).toHaveText("Reacting live");
  await expect(page.locator('[data-kind="screen"] .cam-screen')).toBeVisible();
  await expect(page.locator(".layout-el-chat")).toBeAttached();
  const m = await mask(page);
  expect(m.size.split(", ")).toHaveLength(3);
  expect(m.composite).toBe("exclude, exclude, exclude");
});

test("a scene customized without a camera has no hole", async ({ page }) => {
  const scenes = { chatting: [{ id: "t", type: "title", x: 100, y: 100, w: 800, h: 200 }] };
  await page.goto(`/o/chatting${hash({ layouts: { landscape: { scenes } } })}`);
  await expect(page.locator(".layout-el-camera")).toHaveCount(0);
  expect((await mask(page)).size).toBe("auto");
});

test.describe("in the editor", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("pick Just Chatting, set the topic, customize, and put the camera back", async ({
    page,
  }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    await page.getByRole("radio", { name: "Just Chatting" }).check();
    await expect(page.getByRole("heading", { name: "Preview: Just Chatting" })).toBeVisible();
    await page.getByLabel("Talking about (your topic)").fill("New PC build");
    await expect(page.locator(".editor-pick .layout-el-subtitle")).toContainText("New PC build");
    await page.getByRole("button", { name: "Customize" }).click();
    const layers = page.getByRole("region", { name: "Layers" });
    await layers.getByRole("button", { name: "Camera", exact: true }).click();
    await page.locator(".canvas").focus();
    await page.keyboard.press("Delete");
    await expect(layers.getByRole("button", { name: "Camera", exact: true })).toHaveCount(0);
    await layers.getByRole("button", { name: "Put back the Camera" }).click();
    await expect(layers.getByRole("button", { name: "Camera", exact: true })).toBeVisible();
  });

  test("Reaction names its video box in the layers", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    await page.getByRole("radio", { name: "Reaction" }).check();
    await page.getByRole("button", { name: "Customize" }).click();
    const layers = page.getByRole("region", { name: "Layers" });
    await expect(layers.getByRole("button", { name: "Reaction box", exact: true })).toBeVisible();
    await expect(layers.getByRole("button", { name: "Camera", exact: true })).toBeVisible();
  });
});
