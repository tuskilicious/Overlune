import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AlertView from "../../../src/overlays/alerts/AlertView";
import { defaultSettings } from "../../../src/settings/schema";

describe("AlertView", () => {
  it("renders hostile names, templates and messages as escaped text", () => {
    const html = renderToStaticMarkup(
      createElement(AlertView, {
        settings: {
          ...defaultSettings,
          alerts: { templates: { ...defaultSettings.alerts.templates, sub: "<b>{user}</b>" } },
        },
        alert: {
          kind: "sub",
          user: '<img src=x onerror="alert(1)">',
          amount: 1,
          message: "<i>hi</i>",
        },
      }),
    );
    expect(html).not.toMatch(/<b>|<img|<i>/);
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;i&gt;hi&lt;/i&gt;");
  });

  it("shows nothing but the canvas between alerts", () => {
    const html = renderToStaticMarkup(
      createElement(AlertView, { settings: defaultSettings, alert: null }),
    );
    expect(html).not.toContain("alert-box");
  });
});
