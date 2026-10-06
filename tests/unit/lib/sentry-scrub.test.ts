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
    expect(scrubbed?.request?.url).toBe("https://overlune.app/o/alerts");
    expect(scrubbed?.breadcrumbs).toEqual([{ category: "navigation", data: { to: "/o/chat" } }]);
    expect(JSON.stringify(scrubbed)).not.toContain("secret");
  });

  // T6.99: page-load performance samples carried the settings in span data (`url.full`).
  it("strips fragments from span data, trace context and any other field", () => {
    const event = {
      type: "transaction",
      transaction: "/o/starting",
      contexts: { trace: { data: { "url.full": "http://localhost/o/starting?rm=1#1.SECRET" } } },
      spans: [
        { data: { "url.full": "https://overlune.in/o/chat#1.SECRET", "url.path": "/o/chat" } },
      ],
      extra: { note: "loaded /o/alerts#1.SECRET in OBS" },
      tags: { page: "https://overlune.in/editor#1.SECRET" },
    } as unknown as Event;
    const scrubbed = scrubEvent(event) as unknown as typeof event & Record<string, never>;
    expect(JSON.stringify(scrubbed)).not.toContain("SECRET");
    expect(JSON.stringify(scrubbed)).toContain('"url.full":"http://localhost/o/starting?rm=1"');
    expect(JSON.stringify(scrubbed)).toContain('"url.path":"/o/chat"');
  });

  it("leaves a # that isn't a URL fragment or settings alone", () => {
    const event: Event = { message: "Failed at step #3 in channel #general" };
    expect(scrubEvent(event)?.message).toBe("Failed at step #3 in channel #general");
  });

  it("copes with circular objects, like the ones in a live event", () => {
    const loop: Record<string, unknown> = { url: "https://overlune.in/o/chat#1.SECRET" };
    loop.self = loop;
    const event = {
      request: { url: "https://overlune.in/o/chat#1.SECRET" },
      extra: { loop },
    } as unknown as Event;
    const scrubbed = scrubEvent(event);
    expect(scrubbed?.request?.url).toBe("https://overlune.in/o/chat");
    expect((scrubbed?.extra?.loop as { url: string }).url).toBe("https://overlune.in/o/chat");
  });

  it("drops the event rather than send it unscrubbed if scrubbing fails", () => {
    const event = { request: { url: "https://overlune.in/o/chat#1.SECRET" } } as Event;
    Object.freeze(event.request);
    expect(scrubEvent(event)).toBeNull();
  });
});
