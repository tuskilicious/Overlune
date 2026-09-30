import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../../../src/settings/schema";
import { loadSaved, save } from "../../../src/settings/storage";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe("autosave", () => {
  it("round-trips through storage", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    const settings = { ...defaultSettings, brb: { title: "Snack break", subtitle: "" } };
    save(settings);
    expect(loadSaved()).toEqual({ settings, ok: true });
  });

  it("returns null when nothing is saved", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(loadSaved()).toBeNull();
  });

  it("flags a damaged save like a damaged link", () => {
    const storage = memoryStorage();
    storage.setItem("overlune:settings", "1.garbage");
    vi.stubGlobal("localStorage", storage);
    expect(loadSaved()).toEqual({ settings: defaultSettings, ok: false });
  });

  it("never throws when storage is blocked", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });
    expect(() => save(defaultSettings)).not.toThrow();
    expect(loadSaved()).toBeNull();
  });

  it("never throws when localStorage doesn't exist", () => {
    expect(() => save(defaultSettings)).not.toThrow();
    expect(loadSaved()).toBeNull();
  });
});
