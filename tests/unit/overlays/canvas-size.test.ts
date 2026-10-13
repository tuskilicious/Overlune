import { describe, expect, it } from "vitest";
import { canvasOf, rescale } from "../../../src/overlays/measure";
import { defaultSettings, type LayoutElement, type Settings } from "../../../src/settings/schema";

const sized = (width: number, height: number): Settings => ({
  ...defaultSettings,
  layouts: { landscape: { size: { width, height }, scenes: {} } },
});
const text = (x: number, y: number, w: number, h: number, size?: number) =>
  ({
    id: "t",
    type: "text",
    x,
    y,
    w,
    h,
    r: 0,
    o: 1,
    hidden: false,
    locked: false,
    name: "",
    text: "hi",
    size,
  }) as LayoutElement;

describe("canvas sizes (T9.8)", () => {
  it("draws 16:9 sizes as the 1920×1080 scene, scaled", () => {
    expect(canvasOf(defaultSettings)).toMatchObject({ k: 1, w: 1920, h: 1080 });
    expect(canvasOf(sized(1280, 720))).toMatchObject({ k: 2 / 3, w: 1920, h: 1080 });
    expect(canvasOf(sized(3840, 2160))).toMatchObject({ k: 2, w: 1920, h: 1080 });
  });

  it("gives another shape a box of that shape at the design's short side", () => {
    expect(canvasOf(sized(2560, 1080))).toMatchObject({ k: 1, w: 2560, h: 1080 });
    expect(canvasOf(sized(1080, 1920))).toMatchObject({ w: 1920, h: 3413 });
  });

  it("keeps places proportionally and sizes unstretched", () => {
    const [el] = rescale(
      [text(860, 490, 200, 100, 40)],
      { w: 1920, h: 1080 },
      { w: 1920, h: 3240 },
    );
    // Center (960, 540) moves to (960, 1620); the size stays.
    expect(el).toMatchObject({ x: 860, y: 1570, w: 200, h: 100, size: 40 });
    const [back] = rescale([el!], { w: 1920, h: 3240 }, { w: 1920, h: 1080 });
    expect(back).toMatchObject({ x: 860, y: 490, w: 200, h: 100, size: 40 });
  });

  it("shrinks only what no longer fits", () => {
    const [el] = rescale([text(0, 1000, 2560, 80, 40)], { w: 2560, h: 1080 }, { w: 1920, h: 1080 });
    expect(el).toMatchObject({ x: 0, y: 1010, w: 1920, h: 60, size: 30 });
  });

  it("leaves a layout alone when the box keeps its shape", () => {
    const els = [text(10, 20, 30, 40)];
    expect(rescale(els, { w: 1920, h: 1080 }, { w: 1920, h: 1080 })).toBe(els);
  });
});
