import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { LayoutElement, LayoutScene, Settings } from "../../settings/schema";
import Preview from "../Preview";
import {
  angleTo,
  handles,
  resize,
  snapDistance,
  snapMove,
  type Guide,
  type Handle,
} from "./geometry";
import { canvasOf, naturalBox, rescale, sceneParts } from "../../overlays/measure";
import { defaultLive } from "../../overlays/LiveScene";
import { encode } from "../../settings/url";
import { Inspector, Layers, elementName, type Adding, type Change } from "./Panels";
import "./canvas.css";

type Gesture =
  | { mode: "move"; x: number; y: number; from: LayoutElement[] }
  | { mode: "resize"; x: number; y: number; from: LayoutElement[]; handle: Handle }
  | { mode: "rotate"; from: LayoutElement[] };

interface Props {
  /** The settings shown, without this scene's elements (the canvas supplies them). */
  settings: Settings;
  /** The scene being customized, and its elements. */
  sceneId: LayoutScene;
  elements: LayoutElement[];
  /** Draws the scene for some settings: the editor's StartingSoon or TextScene. */
  scene: (settings: Settings) => ReactNode;
  /** Keeps an edit. A drag, resize or turn is its own undo step; `merge` (arrow-key nudges) joins a burst of them
   *  into one, as typing does. */
  onCommit: (elements: LayoutElement[], merge?: boolean) => void;
}

/**
 * The canvas (T9.4, DESIGN.md "Canvas editor"): the customized scene at its real size scaled to fit, with every
 * element selectable, draggable, resizable and turnable, snapping to the canvas and to each other, and nudged by the
 * arrow keys. Changes stay a draft while a gesture runs, then are kept once, so undo takes back a whole drag.
 */
export default function Canvas({ settings, sceneId, elements, scene, onCommit }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<LayoutElement[] | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const gesture = useRef<Gesture | null>(null);
  /** The scene's box (T9.8): layouts are in its units. */
  const size = canvasOf(settings);

  useLayoutEffect(() => {
    const el = area.current!;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / size.w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w]);

  const shown = draft ?? elements;
  const withElements = (els: LayoutElement[]): Settings => {
    const landscape = settings.layouts.landscape ?? {
      size: { width: 1920, height: 1080 },
      scenes: {},
    };
    return {
      ...settings,
      layouts: {
        ...settings.layouts,
        landscape: { ...landscape, scenes: { ...landscape.scenes, [sceneId]: els } },
      },
    };
  };
  const canvasPoint = (e: { clientX: number; clientY: number }) => {
    const r = area.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  const update = (
    from: LayoutElement[],
    ids: string[],
    change: (el: LayoutElement) => LayoutElement,
  ) => from.map((el) => (ids.includes(el.id) && !el.locked ? change(el) : el));

  const startMove = (e: PointerEvent, id: string) => {
    e.stopPropagation();
    area.current!.focus({ preventScroll: true });
    const ids = e.shiftKey
      ? selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
      : selected.includes(id)
        ? selected
        : [id];
    setSelected(ids);
    if (e.shiftKey) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    gesture.current = { mode: "move", x: p.x, y: p.y, from: elements };
  };
  const startResize = (e: PointerEvent, handle: Handle) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    gesture.current = { mode: "resize", x: p.x, y: p.y, from: elements, handle };
  };
  const startRotate = (e: PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { mode: "rotate", from: elements };
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const p = canvasPoint(e);
    if (g.mode === "move") {
      let dx = Math.round(p.x - g.x);
      let dy = Math.round(p.y - g.y);
      const lead = g.from.find((el) => el.id === selected[0]);
      let lines: Guide[] = [];
      if (lead && !e.altKey) {
        const others = g.from.filter((el) => !selected.includes(el.id) && !el.hidden);
        const snap = snapMove(
          { x: lead.x + dx, y: lead.y + dy, w: lead.w, h: lead.h },
          others,
          size,
          snapDistance(scale),
        );
        dx += Math.round(snap.dx);
        dy += Math.round(snap.dy);
        lines = snap.guides;
      }
      setGuides(lines);
      setDraft(update(g.from, selected, (el) => ({ ...el, x: el.x + dx, y: el.y + dy })));
    } else if (g.mode === "resize") {
      setDraft(
        update(g.from, selected.slice(0, 1), (el) => ({
          ...el,
          ...resize(el, g.handle, p.x - g.x, p.y - g.y, e.shiftKey),
        })),
      );
    } else {
      setDraft(
        update(g.from, selected.slice(0, 1), (el) => ({
          ...el,
          r: angleTo(el, p.x, p.y, e.shiftKey ? 15 : 1),
        })),
      );
    }
  };
  const onPointerUp = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setGuides([]);
    if (draft) onCommit(draft);
    setDraft(null);
  };

  const one = selected.length === 1 ? shown.find((el) => el.id === selected[0]) : undefined;
  /** One element changed, from the panels. */
  const change: Change = (id, patch, merge) =>
    onCommit(
      elements.map((el) => (el.id === id ? ({ ...el, ...patch } as LayoutElement) : el)),
      merge,
    );
  /** Up (1) or down (-1) one layer: later in the list is on top. */
  const move = (id: string, by: 1 | -1) => {
    const at = elements.findIndex((el) => el.id === id);
    const to = at + by;
    if (at === -1 || to < 0 || to >= elements.length) return;
    const next = [...elements];
    [next[at], next[to]] = [next[to]!, next[at]!];
    onCommit(next);
  };
  /** A short random id no element in the scene has. */
  const newId = () => {
    for (;;) {
      const id = Math.random().toString(36).slice(2, 8);
      if (!elements.some((el) => el.id === id)) return id;
    }
  };
  /** The link's length with these elements, against the size budget (STACK.md: warn at 16 KB, stop at 24 KB). */
  const linkBytes = (els: LayoutElement[]) => encode(withElements(els)).length;
  const room =
    elements.length >= 40
      ? "A scene holds 40 elements at most. Delete one to add another."
      : linkBytes(elements) > 24_000
        ? "Your link is full (24 KB). Delete something to add more."
        : null;
  const parts: LayoutElement["type"][] =
    sceneId === "live"
      ? (["chat", "alerts", "frame"] as const).filter((t) => !elements.some((el) => el.type === t))
      : sceneParts
          .filter(
            ([selector, type]) =>
              !elements.some((el) => el.type === type) &&
              area.current?.querySelector(`.scene ${selector}`) !== null,
          )
          .map(([, type]) => type);
  /** Adds an element and selects it: added ones in the middle of the canvas, the scene's own parts back where the
   *  look puts them (still laid out, hidden, in the composed scene). */
  const add: Adding = (kind, src) => {
    if (room) return;
    const id = newId();
    const base = { id, r: 0, o: 1, hidden: false, locked: false, name: "" };
    const centred = (w: number, h: number) => ({
      x: Math.round((size.w - w) / 2),
      y: Math.round((size.h - h) / 2),
      w,
      h,
    });
    let el: LayoutElement;
    if (kind === "text")
      el = { ...base, type: "text", ...centred(800, 120), text: "Your text", font: "heading" };
    else if (kind === "image")
      el = { ...base, type: "image", ...centred(400, 400), src: src!, fit: "contain" };
    else if (kind === "shape")
      el = {
        ...base,
        type: "shape",
        ...centred(400, 200),
        kind: "rect",
        fill: "surface",
        strokeWidth: 0,
        radius: 16,
      };
    else if (kind === "chat" || kind === "alerts" || kind === "frame") {
      const { x, y, w, h } = rescale(defaultLive, { w: 1920, h: 1080 }, size).find(
        (d) => d.type === kind,
      )!;
      el = { ...base, type: kind, x, y, w, h };
    } else {
      const scene = area.current?.querySelector<HTMLElement>(".scene");
      const part = scene?.querySelector<HTMLElement>(sceneParts.find(([, t]) => t === kind)![0]);
      const box = scene && part ? naturalBox(part, scene) : centred(600, 160);
      el = { ...base, type: kind, ...box } as LayoutElement;
    }
    onCommit([...elements, el]);
    setSelected([id]);
  };
  const remove = (ids: string[]) => {
    onCommit(elements.filter((el) => !ids.includes(el.id)));
    setSelected([]);
  };
  /** Copies of the selected added elements, 24px down and right. The scene's own parts appear once, so they don't copy. */
  const duplicate = (ids: string[]) => {
    if (room) return;
    const copies = elements
      .filter(
        (el) =>
          ids.includes(el.id) && (el.type === "text" || el.type === "image" || el.type === "shape"),
      )
      .map((el) => ({
        ...el,
        id: newId(),
        x: el.x + 24,
        y: el.y + 24,
        name: el.name && `${el.name} copy`,
      }));
    if (!copies.length) return;
    onCommit([...elements, ...copies]);
    setSelected(copies.map((c) => c.id));
  };

  const select = (id: string, add: boolean) =>
    setSelected((s) => (add ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelected([]);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selected.length) {
      e.preventDefault();
      remove(selected);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selected.length) {
      e.preventDefault(); // the browser's bookmark shortcut
      duplicate(selected);
      return;
    }
    if (e.key === "Tab" && shown.length) {
      // Tab and Shift+Tab move through the elements in layer order, then on out of the canvas.
      const at = shown.findIndex((el) => el.id === selected[0]);
      const next = at + (e.shiftKey ? -1 : 1);
      if (next < 0 || next >= shown.length || (at === -1 && e.shiftKey)) return;
      e.preventDefault();
      setSelected([shown[at === -1 ? 0 : next]!.id]);
      return;
    }
    if ((e.key === "[" || e.key === "]") && one) {
      e.preventDefault();
      move(one.id, e.key === "]" ? 1 : -1);
      return;
    }
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const dir = arrows[e.key];
    if (!dir || !selected.length) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const [dx, dy] = [dir[0] * step, dir[1] * step];
    onCommit(
      update(elements, selected, (el) =>
        e.altKey
          ? { ...el, w: Math.max(8, el.w + dx), h: Math.max(8, el.h + dy) }
          : { ...el, x: el.x + dx, y: el.y + dy },
      ),
      true,
    );
  };

  const box = (el: LayoutElement): CSSProperties => ({
    left: el.x * scale,
    top: el.y * scale,
    width: el.w * scale,
    height: el.h * scale,
    rotate: el.r ? `${el.r}deg` : undefined,
  });

  return (
    <div className="canvas-editor">
      <div
        ref={area}
        className="canvas"
        tabIndex={0}
        aria-label="Canvas. Tab picks an element, the arrow keys move it, Alt and the arrow keys resize it."
        aria-describedby="canvas-status"
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={() => setSelected([])}
        style={{ aspectRatio: `${size.w} / ${size.h}` }}
      >
        <Preview width={size.w} height={size.h}>
          {scene(withElements(shown))}
        </Preview>
        <div className="canvas-layer">
          {shown
            .filter((el) => !el.hidden)
            .map((el) => (
              <div
                key={el.id}
                className="canvas-hit"
                data-id={el.id}
                data-locked={el.locked || undefined}
                style={box(el)}
                onPointerDown={(e) => startMove(e, el.id)}
              />
            ))}
          {shown
            .filter((el) => selected.includes(el.id))
            .map((el) => (
              <div key={el.id} className="canvas-selection" style={box(el)} aria-hidden>
                <span className="canvas-tag">{elementName(el)}</span>
                {el === one &&
                  !el.locked &&
                  handles.map((h) => (
                    <span
                      key={h}
                      className="canvas-handle"
                      data-handle={h}
                      onPointerDown={(e) => startResize(e, h)}
                    />
                  ))}
                {el === one && !el.locked && (
                  <span className="canvas-rotate" onPointerDown={startRotate} />
                )}
              </div>
            ))}
          {guides.map((g, i) => (
            <span
              key={i}
              className="canvas-guide"
              style={"x" in g ? { left: g.x * scale } : { top: g.y * scale }}
              data-axis={"x" in g ? "x" : "y"}
              aria-hidden
            />
          ))}
        </div>
        <p id="canvas-status" className="sr-only" role="status">
          {one
            ? `${elementName(one)} selected, at ${one.x}, ${one.y}, ${one.w} by ${one.h}${one.r ? `, turned ${one.r} degrees` : ""}${one.locked ? ", locked" : ""}.`
            : selected.length
              ? `${selected.length} elements selected.`
              : "Nothing selected."}
        </p>
      </div>
      <div className="canvas-panels">
        <Layers
          elements={elements}
          selected={selected}
          onSelect={select}
          change={change}
          move={move}
          parts={parts}
          add={add}
          room={room}
          longLink={linkBytes(elements) > 16_000}
        />
        <Inspector
          el={one && elements.find((el) => el.id === one.id)}
          change={change}
          remove={(id) => remove([id])}
          duplicate={(id) => duplicate([id])}
        />
      </div>
    </div>
  );
}
