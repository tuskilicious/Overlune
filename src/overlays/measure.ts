import { createContext } from "react";
import type { LayoutElement, LayoutScene, Settings } from "../settings/schema";
import type { ThemeId } from "../themes/types";

/** Which layout an overlay draws: the landscape one, or the portrait one from `?canvas=vertical` (Phase 10). */
export type CanvasId = "landscape" | "portrait";

/** The canvas the overlays under it draw (FromLink sets it from the link; the editor from its switch). */
export const CanvasContext = createContext<CanvasId>("landscape");

/** The link's canvas: `?canvas=vertical` is portrait, anything else landscape (STACK.md, a public contract). */
export const linkCanvas = (search: string): CanvasId =>
  new URLSearchParams(search).get("canvas") === "vertical" ? "portrait" : "landscape";

/** Looks whose portrait art is done (T10.5 to T10.8 add them in batches of four): the editor offers their four scenes
 *  in Vertical. Live, Just Chatting and Reaction come with both canvases for every look. */
export const portraitLooks: ReadonlySet<ThemeId> = new Set<ThemeId>([]);

/** Whether the editor offers Vertical for this scene of this look (DESIGN.md "Editor", Phase 10). */
export const hasPortrait = (theme: ThemeId, scene: LayoutScene) =>
  scene === "live" || scene === "chatting" || scene === "reaction" || portraitLooks.has(theme);

/** The portrait safe zone (DESIGN.md): every word inside 60px from the left, 140 from the right, 240 from the top
 *  and 680 from the bottom, clear of TikTok's and Shorts' own buttons and comments. */
export const safeZone = { left: 60, right: 140, top: 240, bottom: 680 };

/** Each canvas's design size: the looks are designed at 1920×1080, and their portrait versions at 1080×1920. */
export const designOf: Record<CanvasId, { w: number; h: number }> = {
  landscape: { w: 1920, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

/**
 * The box a scene is drawn on (T9.8, Phase 10). A scene is drawn on a box of the canvas's shape whose short side
 * matches its design, then scaled (`k`) to the canvas: 1280×720 and 4K are the same landscape scene at another scale,
 * and a wider or taller canvas gets a wider or taller scene. A portrait layout uses the portrait design, so 1080×1920
 * is drawn at scale 1. Layouts are in the box's units.
 */
export function canvasOf(settings: Settings, canvas: CanvasId = "landscape") {
  const design = designOf[canvas];
  const { width, height } = settings.layouts[canvas]?.size ?? { width: design.w, height: design.h };
  const k = Math.min(width / design.w, height / design.h);
  return { width, height, k, w: Math.round(width / k), h: Math.round(height / k) };
}

/** Moves elements from one box to another of a new shape: centers keep their place proportionally, and sizes stay
 *  (the box never gets smaller than 1920×1080), so switching sizes and back gives the layout back. Only an element
 *  wider or taller than the new box shrinks, evenly, text too. */
export function rescale(
  els: LayoutElement[],
  from: { w: number; h: number },
  to: { w: number; h: number },
): LayoutElement[] {
  if (from.w === to.w && from.h === to.h) return els;
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  return els.map((el) => {
    const s = Math.min(1, to.w / el.w, to.h / el.h);
    const w = Math.max(8, Math.round(el.w * s));
    const h = Math.max(8, Math.round(el.h * s));
    const moved = {
      ...el,
      w,
      h,
      x: Math.round((el.x + el.w / 2) * sx - w / 2),
      y: Math.round((el.y + el.h / 2) * sy - h / 2),
    };
    if ("size" in moved && moved.size)
      moved.size = Math.min(400, Math.max(8, Math.round(moved.size * s)));
    return moved;
  });
}

/** The composed scene's parts, in stacking order, and the element type each is. */
export const sceneParts: [selector: string, type: LayoutElement["type"]][] = [
  [".scene-logo", "logo"],
  [".scene-title", "title"],
  [".scene-subtitle", "subtitle"],
  [".countdown", "countdown"],
  [".scene-socials", "socials"],
  [".scene-ticker", "ticker"],
];

/** An element's offset from the page, by layout offsets alone. */
function pageOffset(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let at: HTMLElement | null = el; at; at = at.offsetParent as HTMLElement | null) {
    x += at.offsetLeft;
    y += at.offsetTop;
  }
  return { x, y };
}

/** A part's box in the scene's own px, from layout offsets: transforms (an entrance mid-play, the editor's scaled-down
 *  preview, or the layout's own moves) don't change it. */
export function naturalBox(el: HTMLElement, scene: HTMLElement) {
  const a = pageOffset(el);
  const b = pageOffset(scene);
  return { x: a.x - b.x, y: a.y - b.y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * A look's default layout (T9.3): each part of its composed scene where it sits, as positioned elements. "Customize"
 * starts from this; since a customized scene moves the composed parts themselves (LayoutScene), the default looks
 * exactly like the composed scene. `scene` is the rendered `.scene`, at any scale.
 */
export function measureLayout(scene: HTMLElement): LayoutElement[] {
  return sceneParts.flatMap(([selector, type], i) => {
    const el = scene.querySelector<HTMLElement>(selector);
    const box = el && naturalBox(el, scene);
    if (!box || box.w === 0 || box.h === 0) return [];
    return [
      {
        id: `${type.slice(0, 6)}${i}`,
        type,
        ...box,
        r: 0,
        o: 1,
        hidden: false,
        locked: false,
        name: "",
      } as LayoutElement,
    ];
  });
}
