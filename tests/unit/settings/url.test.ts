import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { defaultSettings, type Settings } from "../../../src/settings/schema";
import { decode, encode } from "../../../src/settings/url";

const raw = (data: unknown) => `#1.${compressToEncodedURIComponent(JSON.stringify(data))}`;

const sample: Settings = {
  theme: "clean-slate",
  logo: "https://example.com/logo.png",
  socials: [{ platform: "twitch", handle: "tuskilicious" }],
  starting: {
    title: "Starting soon 🎮",
    subtitle: "Grab a snack",
    endsAt: 1_790_000_000_000,
    tz: "Asia/Kolkata",
    doneText: "Here we go",
  },
};

describe("settings link", () => {
  it("round-trips", () => {
    const hash = encode(sample);
    expect(hash).toMatch(/^1\./);
    expect(decode(`#${hash}`)).toEqual({ settings: sample, ok: true });
  });

  it("uses defaults for an empty hash without flagging an error", () => {
    expect(decode("")).toEqual({ settings: defaultSettings, ok: true });
  });

  it.each(["#garbage", "#1.!!!notlz", "#2.abc", "#1.", "#.abc", raw(null), raw([1, 2]), raw("hi")])(
    "falls back to defaults for %s",
    (hash) => {
      expect(decode(hash)).toEqual({ settings: defaultSettings, ok: false });
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "http://example.com/a.png",
    "not a url",
  ])("rejects logo %s but keeps the other fields", (logo) => {
    const { settings, ok } = decode(raw({ ...sample, logo }));
    expect(ok).toBe(false);
    expect(settings.logo).toBe("");
    expect(settings.starting).toEqual(sample.starting);
  });

  it("truncates very long text instead of rejecting it", () => {
    const { settings, ok } = decode(
      raw({ ...sample, starting: { ...sample.starting, title: "a".repeat(10_000) } }),
    );
    expect(ok).toBe(true);
    expect(settings.starting.title).toBe("a".repeat(60));
  });

  it("never splits an emoji when truncating", () => {
    const { settings } = decode(
      raw({ ...sample, starting: { ...sample.starting, title: "🎮".repeat(100) } }),
    );
    expect(settings.starting.title).toBe("🎮".repeat(60));
  });

  it("falls back on an unknown time zone or theme", () => {
    const { settings, ok } = decode(
      raw({ ...sample, theme: "nope", starting: { ...sample.starting, tz: "Mars/Olympus" } }),
    );
    expect(ok).toBe(false);
    expect(settings.theme).toBe("clean-slate");
    expect(settings.starting).toEqual(defaultSettings.starting);
    expect(settings.logo).toBe(sample.logo);
  });

  it("drops extra socials beyond the limit", () => {
    const socials = Array.from({ length: 7 }, () => ({ platform: "x", handle: "a" }));
    const { settings, ok } = decode(raw({ ...sample, socials }));
    expect(ok).toBe(false);
    expect(settings.socials).toEqual([]);
  });
});
