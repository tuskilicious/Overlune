import { describe, expect, it } from "vitest";
import { orWait } from "../../../src/lib/lazy-page";

describe("orWait", () => {
  it("passes a loaded module through", () => {
    const m = { default: () => null };
    expect(orWait(m)).toBe(m);
  });

  it("keeps waiting when the load was cancelled for a reload (Sentry JAVASCRIPT-REACT-7)", async () => {
    const settled = await Promise.race([
      Promise.resolve(orWait(undefined)).then(() => "settled"),
      new Promise((r) => setTimeout(() => r("waiting"), 50)),
    ]);
    expect(settled).toBe("waiting");
  });
});
