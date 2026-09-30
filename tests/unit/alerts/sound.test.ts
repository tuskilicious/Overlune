import { afterEach, describe, expect, it, vi } from "vitest";
import { playSound } from "../../../src/alerts/sound";

class FakeAudio {
  static made: FakeAudio[] = [];
  static reject = false;
  volume = 1;
  played = false;
  constructor(public src: string) {
    FakeAudio.made.push(this);
  }
  play() {
    this.played = true;
    return FakeAudio.reject ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeAudio.made = [];
  FakeAudio.reject = false;
});

describe("playSound", () => {
  it("plays the theme sound at the chosen volume", () => {
    vi.stubGlobal("Audio", FakeAudio);
    playSound("clean-slate.ogg", 70);
    expect(FakeAudio.made).toHaveLength(1);
    expect(FakeAudio.made[0]).toMatchObject({
      src: "/sounds/clean-slate.ogg",
      volume: 0.7,
      played: true,
    });
  });

  it("plays nothing at 0%", () => {
    vi.stubGlobal("Audio", FakeAudio);
    playSound("clean-slate.ogg", 0);
    expect(FakeAudio.made).toHaveLength(0);
  });

  it("stays quiet instead of failing when playback is blocked or audio is missing", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    FakeAudio.reject = true;
    expect(() => playSound("clean-slate.ogg", 50)).not.toThrow();
    await Promise.resolve(); // let the rejected play() settle without an unhandled rejection

    vi.stubGlobal("Audio", undefined);
    expect(() => playSound("clean-slate.ogg", 50)).not.toThrow();
  });
});
