import { describe, expect, it } from "vitest";
import { emoteUrl, splitMessage } from "../../../src/twitch/emotes";
import { parseEmotes } from "../../../src/twitch/parse";

describe("splitMessage", () => {
  it("cuts text and emotes apart", () => {
    expect(splitMessage("Kappa hi Keepo", parseEmotes("25:0-4/1902:9-13"))).toEqual([
      { emoteId: "25", name: "Kappa" },
      { text: " hi " },
      { emoteId: "1902", name: "Keepo" },
    ]);
  });

  it("counts code points, so emoji before an emote don't shift it", () => {
    expect(splitMessage("🎮 👍🏽 Kappa!", parseEmotes("25:5-9"))).toEqual([
      { text: "🎮 👍🏽 " },
      { emoteId: "25", name: "Kappa" },
      { text: "!" },
    ]);
  });

  it("skips overlapping and out-of-range emotes", () => {
    expect(splitMessage("Kappa", parseEmotes("25:0-4,2-3/9:3-20"))).toEqual([
      { emoteId: "25", name: "Kappa" },
    ]);
  });

  it("returns plain text with no emotes", () => {
    expect(splitMessage("hello", [])).toEqual([{ text: "hello" }]);
    expect(splitMessage("", [])).toEqual([]);
  });

  it("builds the CDN link", () => {
    expect(emoteUrl("emotesv2_abc")).toBe(
      "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_abc/default/dark/2.0",
    );
  });
});
