import { useContext, type CSSProperties, type ReactNode } from "react";
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
import { CanvasContext, canvasOf, designOf, rescale, type CanvasId } from "./measure";
import { canvasStyle } from "./SceneFrame";
import "./scene.css";

const live = (boxes: Pick<LayoutElement, "type" | "x" | "y" | "w" | "h">[]) =>
  boxes.map(
    (b, i) =>
      ({
        id: `live${i}`,
        r: 0,
        o: 1,
        hidden: false,
        locked: false,
        name: "",
        ...b,
      }) as LayoutElement,
  );

/** Where Live puts things before it's customized: chat down the right, alerts at the top, the frame bottom left. */
export const defaultLive: LayoutElement[] = live([
  { type: "frame", x: 64, y: 656, w: 640, h: 360 },
  { type: "chat", x: 1456, y: 120, w: 400, h: 600 },
  { type: "alerts", x: 410, y: 64, w: 1100, h: 320 },
]);

/** On a portrait canvas (Phase 10, DESIGN.md "Default portrait layouts"): the camera frame across the top, chat in
 *  the lower half of the safe zone, alerts in its upper third. */
export const defaultLivePortrait: LayoutElement[] = live([
  { type: "frame", x: 60, y: 96, w: 960, h: 540 },
  { type: "chat", x: 60, y: 760, w: 880, h: 480 },
  { type: "alerts", x: 60, y: 260, w: 880, h: 440 },
]);

/** The Live overlay's elements on a canvas: its layout, or the default moved onto its box (T9.8). */
export const liveElements = (settings: Settings, canvas: CanvasId = "landscape") =>
  settings.layouts[canvas]?.scenes.live ??
  rescale(
    canvas === "portrait" ? defaultLivePortrait : defaultLive,
    designOf[canvas],
    canvasOf(settings, canvas),
  );

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
  const canvas = useContext(CanvasContext);
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
      style={{ ...themeVars(theme), ...canvasStyle(settings, canvas) }}
    >
      {error}
      {liveElements(settings, canvas)
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
