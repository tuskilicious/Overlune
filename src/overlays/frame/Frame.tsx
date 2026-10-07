import type { CSSProperties, ReactNode } from "react";
import { framePosition, type Settings } from "../../settings/schema";
import { themes } from "../../themes";
import "../../themes/fonts";
import { applyOverrides, themeVars } from "../../themes/vars";
import "./frame.css";

/** /o/frame (T6.88): a border in the look, with a clear middle for the camera underneath it in OBS. */
export default function Frame({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const { width, height, label } = settings.frame;
  // The edge grows with the frame, so a small frame isn't all border and a big one isn't a hairline.
  const edge = Math.round(Math.min(28, Math.max(8, Math.min(width, height) / 24)));
  const style = { ...themeVars(theme), width, height, "--edge": `${edge}px` } as CSSProperties;
  const frame = (
    <div className="frame" data-theme={theme.id} style={style}>
      <div className="frame-edge" />
      {label && <p className="frame-label">{label}</p>}
      {error}
    </div>
  );
  // Placed in Overlune (T6.122): a transparent 1920×1080 canvas with the frame where the streamer put it.
  const at = framePosition(settings.frame);
  if (!at) return frame;
  return (
    <div
      className="frame-canvas"
      style={{ "--x": `${at.x}px`, "--y": `${at.y}px` } as CSSProperties}
    >
      {frame}
    </div>
  );
}
