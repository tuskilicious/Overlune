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
import { Added, color, Fitted } from "./LayoutScene";
import { CanvasContext, canvasOf, designOf, rescale, type CanvasId } from "./measure";
import { canvasStyle, TwoTone } from "./SceneFrame";
import "./scene.css";
import "./layouts.css";

export type CamSceneId = "chatting" | "reaction";

type Box = Pick<LayoutElement, "type" | "x" | "y" | "w" | "h"> & { kind?: "camera" | "screen" };
const elements = (prefix: string, boxes: Box[]) =>
  boxes.map(
    (b, i) =>
      ({
        id: `${prefix}${i}`,
        r: 0,
        o: 1,
        hidden: false,
        locked: false,
        name: "",
        ...b,
      }) as LayoutElement,
  );

/** Where each part sits before the scene is customized (DESIGN.md "Just Chatting and Reaction"), per canvas, in the
 *  canvas's design units. */
export const camDefaults: Record<CamSceneId, Record<CanvasId, LayoutElement[]>> = {
  chatting: {
    landscape: elements("chat", [
      { type: "camera", kind: "camera", x: 64, y: 180, w: 1280, h: 720 },
      { type: "title", x: 1408, y: 180, w: 448, h: 200 },
      { type: "subtitle", x: 1408, y: 420, w: 448, h: 320 },
    ]),
    // Inset a little from the safe zone's edges: a big title's letters reach past its line.
    portrait: elements("chat", [
      { type: "title", x: 60, y: 270, w: 880, h: 130 },
      { type: "camera", kind: "camera", x: 60, y: 420, w: 960, h: 700 },
      { type: "subtitle", x: 60, y: 1135, w: 880, h: 95 },
    ]),
  },
  reaction: {
    landscape: elements("react", [
      { type: "camera", kind: "screen", x: 64, y: 64, w: 1344, h: 756 },
      { type: "camera", kind: "camera", x: 1440, y: 64, w: 416, h: 312 },
      { type: "chat", x: 1440, y: 400, w: 416, h: 616 },
      { type: "title", x: 64, y: 852, w: 1344, h: 164 },
    ]),
    // No chat by default on a phone: TikTok and Shorts show their own over the stream.
    portrait: elements("react", [
      { type: "camera", kind: "screen", x: 60, y: 96, w: 960, h: 540 },
      { type: "title", x: 60, y: 660, w: 880, h: 100 },
      { type: "camera", kind: "camera", x: 60, y: 780, w: 880, h: 495 },
    ]),
  },
};

/** A Just Chatting or Reaction scene's elements on a canvas: its layout, or the default moved onto its box. */
export const camElements = (settings: Settings, scene: CamSceneId, canvas: CanvasId) =>
  settings.layouts[canvas]?.scenes[scene] ??
  rescale(camDefaults[scene][canvas], designOf[canvas], canvasOf(settings, canvas));

/** The frame's edge for a camera box, as Frame draws it: the hole is inset by it, so the edge stays. */
const edgeOf = (el: LayoutElement) =>
  Math.round(Math.min(28, Math.max(8, Math.min(el.w, el.h) / 24)));

/** The scene's background, with a hole for each camera and screen (a CSS mask: every hole, then the whole box,
 *  each excluded from the next). Holes don't turn with their box. */
function holes(els: LayoutElement[], w: number, h: number): CSSProperties | undefined {
  const cams = els.filter((el) => el.type === "camera" && !el.hidden);
  if (!cams.length) return undefined;
  const fill = "linear-gradient(#000 0 0)";
  const inset = (el: LayoutElement) =>
    el.type === "camera" && el.kind === "camera" ? edgeOf(el) : 4;
  const layers = [...cams.map(() => fill), fill];
  return {
    maskImage: layers.join(", "),
    maskRepeat: "no-repeat",
    maskSize: [
      ...cams.map((el) => `${el.w - 2 * inset(el)}px ${el.h - 2 * inset(el)}px`),
      `${w}px ${h}px`,
    ].join(", "),
    maskPosition: [...cams.map((el) => `${el.x + inset(el)}px ${el.y + inset(el)}px`), "0 0"].join(
      ", ",
    ),
    maskComposite: layers.map(() => "exclude").join(", "),
  } as CSSProperties;
}

/**
 * /o/chatting and /o/reaction (T10.3): full-screen scenes in the look (its background and art, its type), with the
 * camera showing through a hole edged by the look's webcam frame, and for Reaction a second hole, outlined in the
 * accent, for the video being reacted to. Every part is a layout element, so all of it moves on the canvas.
 */
export default function CamScene({
  settings,
  scene,
  error,
  sample,
}: {
  settings: Settings;
  scene: CamSceneId;
  error?: ReactNode;
  sample?: { messages: ChatMessage[]; alert: AlertEvent | null };
}) {
  const theme = applyOverrides(themes[settings.theme], settings.advanced);
  const canvas = useContext(CanvasContext);
  const box = canvasOf(settings, canvas);
  const els = camElements(settings, scene, canvas);
  const { title, subtitle } = settings[scene];
  const textStyle = (el: LayoutElement): CSSProperties =>
    el.type === "title" || el.type === "subtitle"
      ? { fontSize: el.size, color: color(el.color), textAlign: el.align }
      : {};
  const part = (el: LayoutElement): ReactNode => {
    switch (el.type) {
      case "camera":
        return el.kind === "screen" ? (
          <div className="cam-screen" />
        ) : (
          <Frame
            settings={{
              ...settings,
              // No name label: it sits on the edge, where the hole would cut it.
              frame: { ...settings.frame, width: el.w, height: el.h, x: null, y: null, label: "" },
            }}
          />
        );
      case "title":
        return (
          <Fitted className="scene-title" style={textStyle(el)} wide>
            <TwoTone text={title} />
          </Fitted>
        );
      case "subtitle":
        return subtitle ? (
          <Fitted className="scene-subtitle cam-topic" style={textStyle(el)} wide>
            {scene === "chatting" && <span className="cam-topic-label">Talking about</span>}
            {subtitle}
          </Fitted>
        ) : null;
      case "chat": {
        const sized = { ...settings, chat: { ...settings.chat, width: el.w, height: el.h } };
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
      default:
        return <Added el={el} />;
    }
  };
  return (
    <div
      className="scene cam-scene"
      data-layout=""
      data-scene={scene}
      data-enter={theme.enter.id}
      data-bg={theme.bgEffect}
      data-theme={theme.id}
      data-canvas={canvas === "portrait" ? canvas : undefined}
      style={{ ...themeVars(theme), ...canvasStyle(settings, canvas), ...holes(els, box.w, box.h) }}
    >
      {error}
      {/* Empty, for the looks whose art hangs off the content block (a sun, palms, panels). */}
      <div className="scene-main" aria-hidden />
      <div className="layout-layer">
        {els
          .filter((el) => !el.hidden)
          .map((el) => (
            <div
              key={el.id}
              className={`layout-el layout-el-${el.type}`}
              data-id={el.id}
              data-kind={el.type === "camera" ? el.kind : undefined}
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                rotate: el.r ? `${el.r}deg` : undefined,
                opacity: el.o < 1 ? el.o : undefined,
              }}
            >
              {part(el)}
            </div>
          ))}
      </div>
    </div>
  );
}
