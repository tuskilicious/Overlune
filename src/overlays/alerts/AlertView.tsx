import type { CSSProperties, ReactNode } from "react";
import type { AlertEvent } from "../../alerts/events";
import { fillTemplate } from "../../alerts/templates";
import type { Settings } from "../../settings/schema";
import { themes } from "../../themes";
import "../../themes/fonts";
import { applyOverrides, themeVars } from "../../themes/vars";
import "./alerts.css";

/** What happened, above the message. The message itself is the streamer's template. */
const kindLabel = {
  raid: "Raid",
  sub: "New subscriber",
  resub: "Resub",
  subgift: "Gift subs",
  bits: "Cheer",
} as const;

interface Props {
  settings: Settings;
  /** The alert showing now, or null between alerts. */
  alert: AlertEvent | null;
  error?: ReactNode;
}

/** 1920×1080 transparent canvas with one alert box centered at the top. Names and templates render as text only. */
export default function AlertView({ settings, alert, error }: Props) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  // The fade-out starts just before the alert's time is up (alerts.css).
  const style = {
    ...themeVars(theme),
    "--alert-ms": `${settings.alerts.seconds * 1000}ms`,
  } as CSSProperties;
  return (
    <div className="alerts" data-anim={theme.alertAnim} data-theme={theme.id} style={style}>
      {error}
      {alert && (
        <div className="alert-box" data-kind={alert.kind}>
          <p className="alert-kind">{kindLabel[alert.kind]}</p>
          <p className="alert-title">
            {fillTemplate(settings.alerts.templates, alert).map((p, i) =>
              "text" in p ? (
                p.text
              ) : (
                <span key={i} className={`alert-${p.name}`}>
                  {p.value}
                </span>
              ),
            )}
          </p>
          {alert.message && <p className="alert-message">{alert.message}</p>}
        </div>
      )}
    </div>
  );
}
