import { describe, expect, it } from "vitest";
import { angleTo, clampMove, resize, snapMove } from "../../../src/editor/canvas/geometry";

const canvas = { w: 1920, h: 1080 };

describe("snapMove", () => {
  it("snaps a box's centre to the canvas's centre within the distance, with a guide", () => {
    const box = { x: 855, y: 100, w: 200, h: 50 }; // centre 955, canvas centre 960
    expect(snapMove(box, [], canvas, 8)).toEqual({ dx: 5, dy: 0, guides: [{ x: 960 }] });
  });

  it("snaps edges to another box's edges, each axis on its own", () => {
    const box = { x: 303, y: 497, w: 100, h: 100 };
    const other = { x: 300, y: 400, w: 50, h: 100 }; // left 300, bottom 500
    expect(snapMove(box, [other], canvas, 8)).toEqual({
      dx: -3,
      dy: 3,
      guides: [{ x: 300 }, { y: 500 }],
    });
  });

  it("leaves a box alone when nothing is within the distance", () => {
    expect(snapMove({ x: 500, y: 300, w: 100, h: 100 }, [], canvas, 8)).toEqual({
      dx: 0,
      dy: 0,
      guides: [],
    });
  });
});

describe("resize", () => {
  const box = { x: 100, y: 100, w: 200, h: 100 };

  it("moves only the dragged edges; the opposite ones stay", () => {
    expect(resize(box, "e", 50, 999)).toEqual({ x: 100, y: 100, w: 250, h: 100 });
    expect(resize(box, "nw", 20, 10)).toEqual({ x: 120, y: 110, w: 180, h: 90 });
  });

  it("never goes below 8px, and keeps the far edge put when it stops", () => {
    expect(resize(box, "w", 500, 0)).toEqual({ x: 292, y: 100, w: 8, h: 100 });
  });

  it("keeps the proportions from a corner when asked", () => {
    expect(resize(box, "se", 100, 0, true)).toEqual({ x: 100, y: 100, w: 300, h: 150 });
  });
});

describe("angleTo", () => {
  const box = { x: 0, y: 0, w: 100, h: 100 }; // centre 50, 50
  it("is 0 straight above, 90 to the right, 180 below", () => {
    expect(angleTo(box, 50, -100)).toBe(0);
    expect(angleTo(box, 200, 50)).toBe(90);
    expect(angleTo(box, 50, 200)).toBe(180);
    expect(angleTo(box, -100, 50)).toBe(-90);
  });
  it("rounds to a step", () => {
    expect(angleTo(box, 120, -30, 15)).toBe(45);
  });
});

describe("clampMove", () => {
  it("stops a box at the canvas's edges", () => {
    const box = { x: 100, y: 100, w: 200, h: 100 };
    expect(clampMove([box], -500, 0, canvas)).toEqual({ dx: -100, dy: 0 });
    expect(clampMove([box], 5000, 5000, canvas)).toEqual({ dx: 1620, dy: 880 });
    expect(clampMove([box], 30, -20, canvas)).toEqual({ dx: 30, dy: -20 });
  });

  it("keeps a group together, by its outer edges", () => {
    const a = { x: 100, y: 100, w: 100, h: 100 };
    const b = { x: 1700, y: 900, w: 100, h: 100 };
    expect(clampMove([a, b], 500, 500, canvas)).toEqual({ dx: 120, dy: 80 });
  });

  it("lets a box already off the edge come back, but never go further out", () => {
    const off = { x: -50, y: 0, w: 200, h: 100 };
    expect(clampMove([off], -10, 0, canvas)).toEqual({ dx: 0, dy: 0 });
    expect(clampMove([off], 20, 0, canvas)).toEqual({ dx: 20, dy: 0 });
  });
});
