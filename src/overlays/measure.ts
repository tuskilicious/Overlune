import type { LayoutElement } from "../settings/schema";

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
      } as LayoutElement,
    ];
  });
}
