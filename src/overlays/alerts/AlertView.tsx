import type { CSSProperties, ReactNode } from "react";
import type { AlertEvent } from "../../alerts/events";
import { ALERT_MS } from "../../alerts/queue";
import { fillTemplate } from "../../alerts/templates";
import type { Settings } from "../../settings/schema";
import { themes } from "../../themes";
import "../../themes/fonts";
import { applyOverrides, themeVars } from "../../themes/vars";
import "./alerts.css";

interface Props {
  settings: Settings;
  /** The alert showing now, or null between alerts. */
  alert: AlertEvent | null;
  error?: ReactNode;
}

/** 1920×1080 transparent canvas with one alert box centered at the top. Names and templates render as text only. */
export default function AlertView({ settings, alert, error }: Props) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const style = { ...themeVars(theme), "--alert-ms": `${ALERT_MS}ms` } as CSSProperties;
  return (
    <div className="alerts" data-anim={theme.alertAnim} style={style}>
      {error}
      {alert && (
        <div className="alert-box" data-kind={alert.kind}>
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
