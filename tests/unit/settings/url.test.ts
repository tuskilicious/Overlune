import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import {
  defaultBots,
  defaultSettings,
  defaultTemplates,
  type Settings,
} from "../../../src/settings/schema";
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
  chat: {
    channel: "Tuskilicious",
    hideCommands: false,
    bots: ["mybot"],
    width: 500,
    height: 800,
    fontScale: 1.5,
    fadeAfter: 30,
  },
  alerts: {
    templates: {
      raid: "RAID {user} {amount}",
      sub: "{user} subbed",
      resub: "{user} x{amount}",
      subgift: "{user} gave {amount}",
      bits: "{user} {amount} bits",
    },
    volume: 40,
  },
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

describe("chat channel (T3.3)", () => {
  it("defaults to empty, so links made before chat existed still load", () => {
    const { settings, ok } = decode(raw({ brb: { title: "Hi" } }));
    expect(ok).toBe(true);
    expect(settings.chat).toEqual({ ...defaultSettings.chat, channel: "" });
  });

  it.each(["two words", "#dallas", "a".repeat(26), "<script>", "twitch.tv/dallas"])(
    "rejects %s and keeps the other fields",
    (channel) => {
      const { settings, ok } = decode(raw({ brb: { title: "Kept" }, chat: { channel } }));
      expect(ok).toBe(false);
      expect(settings.chat.channel).toBe("");
      expect(settings.brb.title).toBe("Kept");
    },
  );
});

describe("chat filters (T3.4)", () => {
  it("give links from T3.3 the usual bots and hidden commands", () => {
    const { settings, ok } = decode(raw({ chat: { channel: "dallas" } }));
    expect(ok).toBe(true);
    expect(settings.chat).toEqual({
      ...defaultSettings.chat,
      channel: "dallas",
      bots: [...defaultBots],
    });
  });

  it("keep an edited bot list, including an empty one", () => {
    expect(decode(raw({ chat: { bots: [] } })).settings.chat.bots).toEqual([]);
    expect(decode(raw({ chat: { bots: ["mybot"] } })).settings.chat.bots).toEqual(["mybot"]);
  });

  it.each([[["Nightbot"]], [["bad name"]], [Array.from({ length: 51 }, (_, i) => `bot${i}`)]])(
    "reject bot list %j",
    (bots) => {
      const { settings, ok } = decode(raw({ brb: { title: "Kept" }, chat: { bots } }));
      expect(ok).toBe(false);
      expect(settings.chat.bots).toEqual([...defaultBots]);
      expect(settings.brb.title).toBe("Kept");
    },
  );
});

describe("chat options (T3.5)", () => {
  it("default to the T3.3 look for older links", () => {
    const { chat } = decode(raw({ chat: { channel: "dallas" } })).settings;
    expect(chat).toMatchObject({ width: 400, height: 600, fontScale: 1, fadeAfter: 0 });
  });

  it.each([
    { width: 100 },
    { width: 5000 },
    { height: 10.5 },
    { fontScale: 3 },
    { fontScale: "big" },
    { fadeAfter: -1 },
    { fadeAfter: 99999 },
  ])("reject %j", (bad) => {
    const { settings, ok } = decode(
      raw({ brb: { title: "Kept" }, chat: { channel: "dallas", ...bad } }),
    );
    expect(ok).toBe(false);
    expect(settings.chat).toEqual(defaultSettings.chat);
    expect(settings.brb.title).toBe("Kept");
  });
});

describe("alert templates (T4.3)", () => {
  it("default for links made before alerts existed", () => {
    const { settings, ok } = decode(raw({ chat: { channel: "dallas" } }));
    expect(ok).toBe(true);
    expect(settings.alerts.templates).toEqual(defaultTemplates);
  });

  it("cut long templates to 100 characters instead of rejecting them", () => {
    const { settings, ok } = decode(raw({ alerts: { templates: { raid: "x".repeat(500) } } }));
    expect(ok).toBe(true);
    expect(settings.alerts.templates.raid).toBe("x".repeat(100));
    expect(settings.alerts.templates.sub).toBe(defaultTemplates.sub);
  });

  it("reject a template that isn't text", () => {
    const { settings, ok } = decode(
      raw({ brb: { title: "Kept" }, alerts: { templates: { sub: 5 } } }),
    );
    expect(ok).toBe(false);
    expect(settings.alerts.templates).toEqual(defaultTemplates);
    expect(settings.brb.title).toBe("Kept");
  });
});

describe("alert volume (T4.4)", () => {
  it("defaults to 70% for older links", () => {
    expect(decode(raw({ alerts: { templates: {} } })).settings.alerts.volume).toBe(70);
  });

  it.each([-1, 101, 50.5, "loud"])("rejects %j", (volume) => {
    const { settings, ok } = decode(raw({ alerts: { volume } }));
    expect(ok).toBe(false);
    expect(settings.alerts.volume).toBe(70);
  });
});
