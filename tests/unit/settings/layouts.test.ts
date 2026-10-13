import lz from "lz-string";
import { describe, expect, it } from "vitest";
import { defaultSettings, settingsV1 } from "../../../src/settings/schema";
import { decode } from "../../../src/settings/url";
import { customized } from "../../../src/overlays/LayoutScene";

// The canvas editor's layouts (T9.2, docs/STACK.md "Layout model").

const box = { x: 100, y: 100, w: 400, h: 120 };
const hash = (data: unknown) => `#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;
const withStarting = (starting: unknown[]) => ({
  layouts: { landscape: { scenes: { starting } } },
});

describe("layouts", () => {
  it("are absent from old links, so every scene renders as the look composes it", () => {
    expect(defaultSettings.layouts).toEqual({});
    expect(customized(defaultSettings, "starting")).toBeNull();
  });

  it("parse with the canvas size and element defaults filled in", () => {
    const s = settingsV1.parse(withStarting([{ id: "t1", type: "title", ...box }]));
    expect(s.layouts.landscape?.size).toEqual({ width: 1920, height: 1080 });
    expect(customized(s, "starting")).toEqual([
      { id: "t1", type: "title", ...box, r: 0, o: 1, hidden: false, locked: false, name: "" },
    ]);
    expect(customized(s, "brb")).toBeNull();
  });

  it("drop a bad element and keep the rest, flagging the link", () => {
    const { settings, ok } = decode(
      hash(
        withStarting([
          { id: "t1", type: "title", ...box },
          { id: "i1", type: "image", ...box, src: "http://example.com/a.png" }, // not https
          { id: "x1", type: "script", ...box }, // no such type
          { id: "c1", type: "countdown", ...box },
        ]),
      ),
    );
    expect(ok).toBe(false);
    expect(customized(settings, "starting")?.map((e) => e.id)).toEqual(["t1", "c1"]);
  });

  it("take colors only as a look token or #rrggbb, never CSS", () => {
    const shape = (fill: string) =>
      settingsV1.safeParse(withStarting([{ id: "s1", type: "shape", ...box, fill }])).success;
    expect(shape("accent")).toBe(true);
    expect(shape("#ff00aa")).toBe(true);
    expect(shape("red")).toBe(false);
    expect(shape("url(https://example.com/x.png)")).toBe(false);
    expect(shape("linear-gradient(red, blue)")).toBe(false);
  });

  it("hold at most 40 elements in a scene", () => {
    const many = Array.from({ length: 41 }, (_, i) => ({
      id: `t${i}`,
      type: "text",
      ...box,
      text: "x",
    }));
    expect(settingsV1.safeParse(withStarting(many)).success).toBe(false);
    expect(settingsV1.safeParse(withStarting(many.slice(0, 40))).success).toBe(true);
  });

  it("cut added text to 200 characters, as every text setting is cut", () => {
    const s = settingsV1.parse(
      withStarting([{ id: "x1", type: "text", ...box, text: "a".repeat(250) }]),
    );
    const el = customized(s, "starting")![0]!;
    expect(el.type === "text" && el.text.length).toBe(200);
  });
});
