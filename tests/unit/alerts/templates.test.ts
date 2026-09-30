import { describe, expect, it } from "vitest";
import type { AlertEvent } from "../../../src/alerts/events";
import { fillTemplate } from "../../../src/alerts/templates";
import { defaultTemplates } from "../../../src/settings/schema";

const alert = (kind: AlertEvent["kind"], amount: number, user = "Ronni"): AlertEvent => ({
  kind,
  user,
  amount,
  message: "",
});
/** Flattens parts back to a string, marking variables as [value]. */
const show = (parts: ReturnType<typeof fillTemplate>) =>
  parts.map((p) => ("text" in p ? p.text : `[${p.value}]`)).join("");

describe("fillTemplate", () => {
  it.each([
    ["raid", 15, "[Ronni] is raiding with [15] viewers!"],
    ["raid", 1, "[Ronni] is raiding with [1] viewer!"],
    ["sub", 1, "[Ronni] just subscribed!"],
    ["resub", 6, "[Ronni] subscribed for [6] months!"],
    ["subgift", 1, "[Ronni] gifted [1] sub!"],
    ["subgift", 20, "[Ronni] gifted [20] subs!"],
    ["bits", 1500, "[Ronni] cheered [1,500] bits!"],
  ] as const)("default %s with %i", (kind, amount, expected) => {
    expect(show(fillTemplate(defaultTemplates, alert(kind, amount)))).toBe(expected);
  });

  it("marks which variable each value came from", () => {
    expect(fillTemplate(defaultTemplates, alert("resub", 6))).toEqual([
      { value: "Ronni", name: "user" },
      { text: " subscribed for " },
      { value: "6", name: "amount" },
      { text: " months!" },
    ]);
  });

  it("uses custom templates, repeats variables and leaves unknown {words} alone", () => {
    const templates = { ...defaultTemplates, sub: "{user}! {user} brought {thing} {amount}" };
    expect(show(fillTemplate(templates, alert("sub", 1)))).toBe(
      "[Ronni]! [Ronni] brought {thing} [1]",
    );
  });

  it("falls back to the default for an empty template", () => {
    const templates = { ...defaultTemplates, raid: "" };
    expect(show(fillTemplate(templates, alert("raid", 3)))).toBe(
      "[Ronni] is raiding with [3] viewers!",
    );
  });

  it("keeps hostile names and templates as plain text values", () => {
    const templates = { ...defaultTemplates, sub: "<img src=x onerror=alert(1)> {user}" };
    const parts = fillTemplate(templates, alert("sub", 1, "<script>x</script>"));
    expect(parts).toEqual([
      { text: "<img src=x onerror=alert(1)> " },
      { value: "<script>x</script>", name: "user" },
    ]);
  });
});
