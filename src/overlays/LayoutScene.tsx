import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { LayoutElement, LayoutScene, Settings } from "../settings/schema";

/** The composed scenes; Live has its own renderer (LiveScene). */
type SceneId = Exclude<LayoutScene, "live">;
import type { ColorToken } from "../themes/types";
import { naturalBox, sceneParts, type CanvasId } from "./measure";
import SceneFrame from "./SceneFrame";
import Countdown from "./starting/Countdown";
import "./scene.css";
import "./layouts.css";

const tokenVar: Record<ColorToken, string> = {
  bg: "--bg",
  surface: "--surface",
  primary: "--primary",
  accent: "--accent",
  text: "--text",
  textMuted: "--text-muted",
};

/** A layout color as CSS: a look token's variable, or the #rrggbb itself (the schema allows nothing else). */
export const color = (c: string | undefined) =>
  c === undefined ? undefined : c.startsWith("#") ? c : `var(${tokenVar[c as ColorToken]})`;

/** Shrinks added text until its lines fit its box. The streamer picks the box, so it may go down to 12px. `wide`
 *  also shrinks it until its longest word fits across (a scene title in a small box, T10.3). */
export function Fitted({
  className,
  style,
  wide = false,
  children,
}: {
  className: string;
  style: CSSProperties;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = style.fontSize === undefined ? "" : `${style.fontSize}px`;
      const base = parseFloat(getComputedStyle(el).fontSize);
      const over = () =>
        el.offsetHeight > box.clientHeight + 1 || (wide && el.scrollWidth > box.clientWidth + 1);
      for (let size = base; over() && size > 12;) {
        size = Math.round(size * 0.9);
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    // Web fonts load when text first uses them, after `ready` may have settled: re-fit as each arrives.
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => document.fonts?.removeEventListener("loadingdone", fit);
  });
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/** An added element (text, image, shape), drawn in the layer over the scene. */
export function Added({ el }: { el: LayoutElement }) {
  switch (el.type) {
    case "text":
      return (
        <Fitted
          className={`layout-text layout-text-${el.font}`}
          style={{ fontSize: el.size, color: color(el.color), textAlign: el.align }}
        >
          {el.text}
        </Fitted>
      );
    case "image":
      return <img className="layout-image" src={el.src} alt="" style={{ objectFit: el.fit }} />;
    case "shape":
      return (
        <div
          className={`layout-shape layout-shape-${el.kind}`}
          style={
            el.kind === "line"
              ? {
                  borderTopColor: color(el.stroke ?? el.fill),
                  borderTopWidth: Math.max(1, el.strokeWidth),
                }
              : {
                  background: color(el.fill),
                  borderColor: color(el.stroke ?? el.fill),
                  borderWidth: el.strokeWidth,
                  borderRadius: el.kind === "rect" ? el.radius : undefined,
                }
          }
        />
      );
    default:
      return null;
  }
}

const added = new Set<LayoutElement["type"]>(["text", "image", "shape"]);

/**
 * Moves the composed scene's own parts to their layout boxes (T9.3): each keeps its look styling and its place in the
 * composed scene (so the look's cards and bands keep their shape) and is moved with translate, scale and rotate from
 * there. A part missing from the layout, or hidden, isn't shown. Re-applied when fonts load or the parts resize, since
 * the moves are measured from where the parts naturally sit.
 */
function useMoveParts(marker: RefObject<HTMLSpanElement | null>, elements: LayoutElement[]) {
  useLayoutEffect(() => {
    const scene = marker.current?.closest<HTMLElement>(".scene");
    if (!scene) return;
    const placed = sceneParts.flatMap(([selector, type]) => {
      const el = scene.querySelector<HTMLElement>(selector);
      return el ? [{ el, item: elements.find((e) => e.type === type) }] : [];
    });
    const apply = () => {
      for (const { el, item } of placed) {
        el.style.translate = el.style.scale = el.style.rotate = el.style.opacity = "";
        el.style.visibility = item && !item.hidden ? "" : "hidden";
        if (!item || item.hidden) continue;
        // The scene's own text can take its own size, color and alignment; set first, since size changes its box.
        if (item.type === "title" || item.type === "subtitle") {
          // Only a size the layout sets: otherwise the composed scene's own fit (T6.26) keeps a long title's size.
          if (item.size !== undefined) {
            el.style.fontSize = `${item.size}px`;
            el.dataset.layoutSize = "";
          } else if (el.dataset.layoutSize !== undefined) {
            el.style.fontSize = "";
            delete el.dataset.layoutSize;
          }
          el.style.color = color(item.color) ?? "";
          el.style.textAlign = item.align ?? "";
        }
        const n = naturalBox(el, scene);
        if (n.w === 0 || n.h === 0) continue;
        // Around the part's centre: move its centre to the box's, then size and turn it there.
        const dx = item.x + item.w / 2 - (n.x + n.w / 2);
        const dy = item.y + item.h / 2 - (n.y + n.h / 2);
        if (dx || dy) el.style.translate = `${dx}px ${dy}px`;
        if (item.w !== n.w || item.h !== n.h) el.style.scale = `${item.w / n.w} ${item.h / n.h}`;
        if (item.r) el.style.rotate = `${item.r}deg`;
        if (item.o < 1) el.style.opacity = String(item.o);
      }
    };
    apply();
    void document.fonts?.ready.then(apply);
    document.fonts?.addEventListener("loadingdone", apply);
    return () => document.fonts?.removeEventListener("loadingdone", apply);
  });
}

/**
 * A customized scene (T9.2, T9.3, docs/STACK.md "Layout model"): the look's composed scene, with its own parts moved to
 * their layout boxes (so every look's styling carries over exactly, and a default layout measured from the composed
 * scene looks the same), and the added elements (text, images, shapes) drawn in a layer over it.
 */
export default function LayoutScene({
  settings,
  scene,
  elements,
  error,
}: {
  settings: Settings;
  scene: SceneId;
  elements: LayoutElement[];
  error?: ReactNode;
}) {
  // A marker in the layer finds the scene: a wrapper around it would stop rules like `.editor-preview > .scene`.
  const marker = useRef<HTMLSpanElement>(null);
  useMoveParts(marker, elements);
  const { title, subtitle } = settings[scene];
  const { endsAt, repeat } = settings.starting;
  const layer = [
    <span key="marker" ref={marker} hidden />,
    ...elements
      .filter((el) => added.has(el.type) && !el.hidden)
      .map((el) => (
        <div
          key={el.id}
          className={`layout-el layout-el-${el.type}`}
          data-id={el.id}
          style={{
            left: el.x,
            top: el.y,
            width: el.w,
            height: el.h,
            rotate: el.r ? `${el.r}deg` : undefined,
            opacity: el.o < 1 ? el.o : undefined,
          }}
        >
          <Added el={el} />
        </div>
      )),
  ];
  return (
    <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error} layer={layer}>
      {scene === "starting" && (endsAt !== null || repeat.mode !== "off") && (
        <Countdown starting={settings.starting} />
      )}
    </SceneFrame>
  );
}

/** A scene's elements when it was customized for this canvas, else null (the composed scene). */
export function customized(
  settings: Settings,
  scene: SceneId,
  canvas: CanvasId = "landscape",
): LayoutElement[] | null {
  return settings.layouts[canvas]?.scenes[scene] ?? null;
}
