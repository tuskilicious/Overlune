import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { defaultSettings, type Settings } from "../../../src/settings/schema";
import { decode, decodeLink, encode } from "../../../src/settings/url";

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
  brb: { title: "Snack break", subtitle: "Back in 5" },
  ending: { title: "GG!", subtitle: "Raiding a friend" },
  advanced: {
    colors: { accent: "#ff2bd6", surface: "#101010" },
    fontHeading: "Orbitron",
    fontBody: null,
  },
};

describe("settings link", () => {
  it("round-trips", () => {
    const hash = encode(sample);
    expect(hash).toMatch(/^1\./);
    expect(decode(`#${hash}`)).toEqual({ settings: sample, ok: true });
  });

  it("fills in BRB and Ending defaults for links made before those scenes existed", () => {
    const { settings, ok } = decode(raw({ starting: { title: "Old link" } }));
    expect(ok).toBe(true);
    expect(settings.starting.title).toBe("Old link");
    expect(settings.brb).toEqual(defaultSettings.brb);
    expect(settings.ending).toEqual(defaultSettings.ending);
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

describe("decodeLink (Load my overlay from a link)", () => {
  const hash = encode(sample);

  it("reads overlay links, editor links and bare fragments, ignoring spaces", () => {
    for (const text of [
      `https://overlune.pages.dev/o/brb#${hash}`,
      `https://overlune.pages.dev/#${hash}`,
      `#${hash}`,
      `  http://localhost:5173/o/starting?rm=1#${hash}\n`,
    ])
      expect(decodeLink(text)).toEqual({ settings: sample, ok: true });
  });

  it("returns null when there is no settings part", () => {
    expect(decodeLink("https://overlune.pages.dev/o/brb")).toBeNull();
    expect(decodeLink("hello")).toBeNull();
    expect(decodeLink("https://overlune.pages.dev/#  ")).toBeNull();
  });

  it("flags a damaged link but still returns usable settings", () => {
    expect(decodeLink("https://overlune.pages.dev/o/brb#1.garbage")).toEqual({
      settings: defaultSettings,
      ok: false,
    });
  });
});

describe("advanced overrides (T2.7)", () => {
  it("default to none, so links made before T2.7 look exactly as before", () => {
    expect(decode(raw({ brb: { title: "Hi" } })).settings.advanced).toEqual({
      colors: {},
      fontHeading: null,
      fontBody: null,
    });
  });

  it.each([
    "red",
    "#fff",
    "url(https://evil.example/x.png)",
    "#12345g",
    "linear-gradient(red, blue)",
  ])("reject %s as a color and fall back to the theme", (bad) => {
    const { settings, ok } = decode(
      raw({ brb: { title: "Kept" }, advanced: { colors: { accent: bad } } }),
    );
    expect(ok).toBe(false);
    expect(settings.advanced.colors).toEqual({});
    expect(settings.brb.title).toBe("Kept");
  });

  it("reject unknown color names and fonts that aren't bundled", () => {
    expect(decode(raw({ advanced: { colors: { border: "#000000" } } })).ok).toBe(false);
    expect(decode(raw({ advanced: { fontHeading: "Comic Sans MS" } })).ok).toBe(false);
  });
});
