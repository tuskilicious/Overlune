import { describe, expect, it } from "vitest";
import type { Event } from "@sentry/react";
import { scrubBreadcrumb, scrubEvent, stripFragment } from "../../../src/lib/sentry-scrub";

describe("stripFragment", () => {
  it("removes the settings fragment", () => {
    expect(stripFragment("https://overlune.app/o/chat#1.N4Ig")).toBe("https://overlune.app/o/chat");
  });
  it("leaves URLs without a fragment unchanged", () => {
    expect(stripFragment("https://overlune.app/o/chat")).toBe("https://overlune.app/o/chat");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "console", message: "chat: hello" })).toBeNull();
  });
  it("strips fragments from navigation breadcrumbs", () => {
    const result = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/o/brb#1.abc", to: "/o/starting#1.def" },
    });
    expect(result?.data).toEqual({ from: "/o/brb", to: "/o/starting" });
  });
});

describe("scrubEvent", () => {
  it("strips fragments from the request URL and breadcrumbs", () => {
    const event: Event = {
      request: { url: "https://overlune.app/o/alerts#1.secret" },
      breadcrumbs: [
        { category: "console", message: "leak" },
        { category: "navigation", data: { to: "/o/chat#1.secret" } },
      ],
    };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request?.url).toBe("https://overlune.app/o/alerts");
    expect(scrubbed.breadcrumbs).toEqual([{ category: "navigation", data: { to: "/o/chat" } }]);
    expect(JSON.stringify(scrubbed)).not.toContain("secret");
  });
});
