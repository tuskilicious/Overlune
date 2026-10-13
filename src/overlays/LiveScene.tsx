import type { CSSProperties, ReactNode } from "react";
import type { AlertEvent } from "../alerts/events";
import type { LayoutElement, Settings } from "../settings/schema";
import { themes } from "../themes";
import "../themes/fonts";
import { applyOverrides, themeVars } from "../themes/vars";
import AlertView from "./alerts/AlertView";
import Alerts from "./alerts/Alerts";
import Chat from "./chat/Chat";
import ChatView, { type ChatMessage } from "./chat/ChatView";
import Frame from "./frame/Frame";
import { Added } from "./LayoutScene";
import { canvasOf, rescale } from "./measure";
import { canvasStyle } from "./SceneFrame";
import "./scene.css";

/** Where Live puts things before it's customized: chat down the right, alerts at the top, the frame bottom left. */
export const defaultLive: LayoutElement[] = [
  { type: "frame", x: 64, y: 656, w: 640, h: 360 },
  { type: "chat", x: 1456, y: 120, w: 400, h: 600 },
  { type: "alerts", x: 410, y: 64, w: 1100, h: 320 },
].map(
  (b, i) =>
    ({ id: `live${i}`, r: 0, o: 1, hidden: false, locked: false, name: "", ...b }) as LayoutElement,
);

/** The Live overlay's elements: its layout, or the default moved onto its canvas (T9.8). */
export const liveElements = (settings: Settings) =>
  settings.layouts.landscape?.scenes.live ??
  rescale(defaultLive, { w: 1920, h: 1080 }, canvasOf(settings));

/**
 * /o/live (T9.7): one browser source with chat, alerts and the webcam frame, each in its box on a see-through
 * 1920×1080 canvas, plus any added text, pictures and shapes. Each part is today's overlay sized to its box, so the
 * look carries over. In the editor (`sample`), chat shows sample messages and alerts a sample alert instead of
 * connecting to Twitch.
 */
export default function LiveScene({
  settings,
  error,
  sample,
}: {
  settings: Settings;
  error?: ReactNode;
  sample?: { messages: ChatMessage[]; alert: AlertEvent | null };
}) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const part = (el: LayoutElement): ReactNode => {
    const box = { ...settings };
    switch (el.type) {
      case "chat": {
        const sized = { ...box, chat: { ...box.chat, width: el.w, height: el.h } };
        return sample ? (
          <ChatView settings={sized} messages={sample.messages} />
        ) : (
          <Chat settings={sized} />
        );
      }
      case "alerts":
        return sample ? (
          <AlertView settings={settings} alert={sample.alert} />
        ) : (
          <Alerts settings={settings} />
        );
      case "frame":
        return (
          <Frame
            settings={{
              ...box,
              frame: { ...box.frame, width: el.w, height: el.h, x: null, y: null },
            }}
          />
        );
      default:
        return <Added el={el} />;
    }
  };
  return (
    <div
      className="live"
      data-theme={theme.id}
      style={{ ...themeVars(theme), ...canvasStyle(settings) }}
    >
      {error}
      {liveElements(settings)
        .filter((el) => !el.hidden)
        .map((el) => (
          <div
            key={el.id}
            className={`layout-el layout-el-${el.type}`}
            data-id={el.id}
            style={
              {
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                rotate: el.r ? `${el.r}deg` : undefined,
                opacity: el.o < 1 ? el.o : undefined,
              } as CSSProperties
            }
          >
            {part(el)}
          </div>
        ))}
    </div>
  );
}
