import { describe, expect, it } from "vitest";
import { createReporter } from "../../../src/lib/sentry";

describe("errors before Sentry loads (T6.93)", () => {
  it("are held, then handed over in order, and later ones go straight through", () => {
    const r = createReporter();
    const sent: unknown[][] = [];
    r.report(new Error("first"), "at <App>");
    r.report("second");
    r.ready((error, stack) => sent.push([String(error), stack]));
    r.report("third");
    expect(sent).toEqual([
      ["Error: first", "at <App>"],
      ["second", undefined],
      ["third", undefined],
    ]);
  });

  it("holds at most 20, so an error loop can't grow the queue without end", () => {
    const r = createReporter();
    for (let i = 0; i < 100; i++) r.report(i);
    const sent: unknown[] = [];
    r.ready((e) => sent.push(e));
    expect(sent).toHaveLength(20);
  });
});
