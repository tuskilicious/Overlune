/** The canvas's maths (T9.4): boxes in canvas px, snapping, resizing and turning. Pure, so it is tested alone. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A line to draw while snapping: vertical at `x`, or horizontal at `y`. */
export type Guide = { x: number } | { y: number };

/** The snapping distance in canvas px, at the scale the canvas is shown (8 screen px). */
export const snapDistance = (scale: number) => 8 / scale;

/**
 * How far to nudge `box` so one of its edges or its centre meets the canvas's edges or centre, or another box's edges or
 * centre, if one is within `distance` on each axis; and the guides to show. Each axis snaps on its own.
 */
export function snapMove(
  box: Box,
  others: Box[],
  canvas: { w: number; h: number },
  distance: number,
): { dx: number; dy: number; guides: Guide[] } {
  const axis = (start: number, size: number, targets: number[]) => {
    let best: { d: number; at: number } | null = null;
    for (const t of targets)
      for (const c of [start, start + size / 2, start + size]) {
        const d = t - c;
        if (Math.abs(d) <= distance && (!best || Math.abs(d) < Math.abs(best.d)))
          best = { d, at: t };
      }
    return best;
  };
  const xs = [0, canvas.w / 2, canvas.w, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const ys = [0, canvas.h / 2, canvas.h, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
  const sx = axis(box.x, box.w, xs);
  const sy = axis(box.y, box.h, ys);
  return {
    dx: sx?.d ?? 0,
    dy: sy?.d ?? 0,
    guides: [...(sx ? [{ x: sx.at }] : []), ...(sy ? [{ y: sy.at }] : [])],
  };
}

/** Which edges a resize handle moves: n, s, e, w and the corners. */
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const MIN = 8;

/**
 * `box` resized by dragging `handle` by (dx, dy) canvas px. The opposite edge stays put; a corner with `keepRatio` keeps
 * the box's proportions (by the larger move). Never smaller than 8px. Rotation is ignored: a turned box resizes along
 * the canvas's axes. (ponytail: resize in the box's own turned axes if streamers turn and resize a lot)
 */
export function resize(box: Box, handle: Handle, dx: number, dy: number, keepRatio = false): Box {
  let { x, y, w, h } = box;
  if (handle.includes("e")) w = Math.max(MIN, box.w + dx);
  if (handle.includes("s")) h = Math.max(MIN, box.h + dy);
  if (handle.includes("w")) {
    w = Math.max(MIN, box.w - dx);
    x = box.x + box.w - w;
  }
  if (handle.includes("n")) {
    h = Math.max(MIN, box.h - dy);
    y = box.y + box.h - h;
  }
  if (keepRatio && handle.length === 2) {
    const k = Math.max(w / box.w, h / box.h);
    const nw = Math.max(MIN, Math.round(box.w * k));
    const nh = Math.max(MIN, Math.round(box.h * k));
    if (handle.includes("w")) x = box.x + box.w - nw;
    if (handle.includes("n")) y = box.y + box.h - nh;
    w = nw;
    h = nh;
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** The turn, in whole degrees from -180 to 180, that points the box's top at (px, py); `step` rounds it (15 with Shift). */
export function angleTo(box: Box, px: number, py: number, step = 1): number {
  const deg = (Math.atan2(py - (box.y + box.h / 2), px - (box.x + box.w / 2)) * 180) / Math.PI + 90;
  const r = Math.round(deg / step) * step;
  const wrapped = ((((r + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}
