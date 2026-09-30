import { defaultTemplates, type Settings } from "../settings/schema";
import type { AlertEvent } from "./events";

/** Template words, or a filled-in variable (styled differently). Rendered as React text only, never HTML. */
export type TemplatePart = { text: string } | { value: string; name: "user" | "amount" };

/**
 * Fills {user}, {amount} and {s} ("s" unless the amount is 1). Unknown {words} stay as written.
 * An empty template falls back to the default for that alert type.
 */
export function fillTemplate(
  templates: Settings["alerts"]["templates"],
  alert: AlertEvent,
): TemplatePart[] {
  const template = templates[alert.kind] || defaultTemplates[alert.kind];
  const parts: TemplatePart[] = [];
  const pushText = (text: string) => {
    const last = parts.at(-1);
    if (last && "text" in last) last.text += text;
    else if (text) parts.push({ text });
  };
  for (const piece of template.split(/(\{(?:user|amount|s)\})/)) {
    if (piece === "{user}") parts.push({ value: alert.user, name: "user" });
    else if (piece === "{amount}")
      parts.push({ value: alert.amount.toLocaleString("en-US"), name: "amount" });
    else if (piece === "{s}") pushText(alert.amount === 1 ? "" : "s");
    else pushText(piece);
  }
  return parts;
}
