import { describe, expect, it } from "vitest";
import { sceneCollection } from "../../../src/editor/scene-collection";
import { defaultSettings } from "../../../src/settings/schema";
import { decode } from "../../../src/settings/url";

let n = 0;
const settings = {
  ...defaultSettings,
  theme: "daylight" as const,
  chat: { ...defaultSettings.chat, channel: "ronnistreams", width: 420, height: 560 },
  frame: { width: 800, height: 450, label: "Ronni" },
};
const c = sceneCollection(settings, "https://overlune.in", () => `id-${++n}`);
const browsers = c.sources.filter((s) => s.id === "browser_source");
const scenes = c.sources.filter((s) => s.id === "scene");

describe("OBS scene collection (T6.90)", () => {
  it("has a Browser source per overlay, holding the streamer's link and size", () => {
    const by = Object.fromEntries(
      browsers.map((b) => [b.name, b.settings as Record<string, unknown>]),
    );
    expect(Object.keys(by)).toEqual([
      "Overlune Starting Soon",
      "Overlune Be Right Back",
      "Overlune Stream Ending",
      "Overlune Chat",
      "Overlune Webcam frame",
      "Overlune Alerts",
    ]);
    expect(by["Overlune Chat"]).toMatchObject({ width: 420, height: 560 });
    expect(by["Overlune Webcam frame"]).toMatchObject({ width: 800, height: 450 });
    expect(by["Overlune Starting Soon"]).toMatchObject({ width: 1920, height: 1080 });
    // Each link opens that overlay with these exact settings.
    for (const b of browsers) {
      const url = String((b.settings as { url: string }).url);
      expect(url).toMatch(
        /^https:\/\/overlune\.in\/o\/(starting|brb|ending|chat|frame|alerts)#1\./,
      );
      expect(decode(url.slice(url.indexOf("#")))).toEqual({ settings, ok: true });
    }
  });

  it("turns on Control audio via OBS for Alerts only", () => {
    for (const b of browsers)
      expect((b.settings as { reroute_audio: boolean }).reroute_audio).toBe(
        b.name === "Overlune Alerts",
      );
  });

  it("makes four scenes, Starting Soon first, with Alerts on top of each", () => {
    expect(c.scene_order.map((s) => s.name)).toEqual([
      "Overlune: Starting Soon",
      "Overlune: Live",
      "Overlune: Be Right Back",
      "Overlune: Stream Ending",
    ]);
    expect(c.current_scene).toBe("Overlune: Starting Soon");
    const uuids = new Set(browsers.map((b) => b.uuid));
    for (const s of scenes) {
      const items = (s.settings as { items: { name: string; source_uuid: string }[] }).items;
      for (const it of items) expect(uuids.has(it.source_uuid)).toBe(true);
      expect(items.at(-1)!.name).toBe("Overlune Alerts");
    }
  });

  it("puts chat bottom right and the frame bottom left in the Live scene, on a 1920×1080 canvas", () => {
    const live = scenes.find((s) => s.name === "Overlune: Live")!;
    const items = (live.settings as { items: { name: string; pos: { x: number; y: number } }[] })
      .items;
    const pos = Object.fromEntries(items.map((i) => [i.name, i.pos]));
    expect(pos["Overlune Chat"]).toEqual({ x: 1920 - 420 - 40, y: 1080 - 560 - 40 });
    expect(pos["Overlune Webcam frame"]).toEqual({ x: 40, y: 1080 - 450 - 40 });
    expect(pos["Overlune Alerts"]).toEqual({ x: 0, y: 0 });
  });

  it("gives every source and scene its own id", () => {
    const ids = c.sources.map((s) => s.uuid);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
