import type { LayoutElement } from "../../settings/schema";
import { colorTokens, type ColorToken } from "../../themes/types";

/** What each element is called: the streamer's name for it, or its type's. */
export const typeName: Record<LayoutElement["type"], string> = {
  title: "Title",
  subtitle: "Subtitle",
  countdown: "Countdown",
  socials: "Socials",
  logo: "Logo",
  ticker: "Ticker",
  text: "Text",
  image: "Image",
  shape: "Shape",
};
export const elementName = (el: LayoutElement) => el.name.trim() || typeName[el.type];

const tokenName: Record<ColorToken, string> = {
  bg: "Background",
  surface: "Panel",
  primary: "Headline",
  accent: "Accent",
  text: "Text",
  textMuted: "Muted text",
};

/** One element changed; `merge` joins a burst of typing or nudging into one undo step. */
export type Change = (id: string, patch: Partial<LayoutElement>, merge?: boolean) => void;

/**
 * The layers panel (T9.5): every element, top layer first, to select, hide, lock and reorder. A list of rows with
 * plain buttons, so each control is reachable by Tab and named for screen readers.
 */
export function Layers({
  elements,
  selected,
  onSelect,
  change,
  move,
}: {
  elements: LayoutElement[];
  selected: string[];
  onSelect: (id: string, add: boolean) => void;
  change: Change;
  move: (id: string, by: 1 | -1) => void;
}) {
  const top = [...elements].reverse();
  return (
    <section className="canvas-panel canvas-layers" aria-labelledby="layers-heading">
      <h3 id="layers-heading">Layers</h3>
      <ol>
        {top.map((el, i) => {
          const name = elementName(el);
          return (
            <li key={el.id} data-selected={selected.includes(el.id) || undefined}>
              <button
                type="button"
                className="canvas-layer-name"
                aria-pressed={selected.includes(el.id)}
                onClick={(e) => onSelect(el.id, e.shiftKey)}
              >
                {name}
              </button>
              <button
                type="button"
                aria-pressed={el.hidden}
                aria-label={`Hide ${name}`}
                title="Hide"
                onClick={() => change(el.id, { hidden: !el.hidden })}
              >
                {el.hidden ? "Hidden" : "Shown"}
              </button>
              <button
                type="button"
                aria-pressed={el.locked}
                aria-label={`Lock ${name}`}
                title="Lock"
                onClick={() => change(el.id, { locked: !el.locked })}
              >
                {el.locked ? "Locked" : "Free"}
              </button>
              {/* Only where there's somewhere to go (no disabled buttons: DESIGN.md). */}
              {i > 0 && (
                <button
                  type="button"
                  aria-label={`Move ${name} up a layer`}
                  onClick={() => move(el.id, 1)}
                >
                  Up
                </button>
              )}
              {i < top.length - 1 && (
                <button
                  type="button"
                  aria-label={`Move ${name} down a layer`}
                  onClick={() => move(el.id, -1)}
                >
                  Down
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** A number field for one box value. */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="canvas-number">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </label>
  );
}

/** A color: one of the look's own, or your own (#rrggbb, from the native picker). "" keeps the look's. */
function ColorField({
  label,
  value,
  allowNone,
  onChange,
}: {
  label: string;
  value: string | undefined;
  allowNone: boolean;
  onChange: (c: string | undefined) => void;
}) {
  const own = value?.startsWith("#");
  return (
    <div className="canvas-color">
      <label>
        {label}
        <select
          value={own ? "own" : (value ?? "")}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? undefined
                : e.target.value === "own"
                  ? "#ffffff"
                  : e.target.value,
            )
          }
        >
          {allowNone && <option value="">The look&rsquo;s</option>}
          {colorTokens.map((t) => (
            <option key={t} value={t}>
              {tokenName[t]}
            </option>
          ))}
          <option value="own">Your own</option>
        </select>
      </label>
      {own && (
        <input
          type="color"
          aria-label={`${label}: your own color`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * The inspector (T9.5): the selected element's name, place, size, turn and opacity, then its own style. Every canvas
 * action has its field here, so the canvas is a pointer convenience and everything works by keyboard.
 */
export function Inspector({ el, change }: { el: LayoutElement | undefined; change: Change }) {
  if (!el)
    return (
      <section className="canvas-panel canvas-inspector" aria-labelledby="inspector-heading">
        <h3 id="inspector-heading">Inspector</h3>
        <p className="editor-hint">
          Pick one element on the canvas or in Layers to change it here.
        </p>
      </section>
    );
  const set = (patch: Partial<LayoutElement>) => change(el.id, patch, true);
  return (
    <section className="canvas-panel canvas-inspector" aria-labelledby="inspector-heading">
      <h3 id="inspector-heading">Inspector: {elementName(el)}</h3>
      <label>
        Name in Layers
        <input
          value={el.name}
          maxLength={40}
          placeholder={typeName[el.type]}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <div className="canvas-numbers">
        <NumberField label="X" value={el.x} min={-3840} max={7680} onChange={(x) => set({ x })} />
        <NumberField label="Y" value={el.y} min={-3840} max={7680} onChange={(y) => set({ y })} />
        <NumberField label="Width" value={el.w} min={8} max={7680} onChange={(w) => set({ w })} />
        <NumberField label="Height" value={el.h} min={8} max={7680} onChange={(h) => set({ h })} />
        <NumberField
          label="Turn (°)"
          value={el.r}
          min={-180}
          max={180}
          onChange={(r) => set({ r })}
        />
      </div>
      <label className="editor-slider">
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(el.o * 100)}
          onChange={(e) => set({ o: Number(e.target.value) / 100 })}
        />
        <output aria-hidden>{Math.round(el.o * 100)}%</output>
      </label>
      {(el.type === "title" || el.type === "subtitle" || el.type === "text") && (
        <>
          {el.type === "text" && (
            <>
              <label>
                Words
                <textarea
                  value={el.text}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => set({ text: e.target.value })}
                />
              </label>
              <label>
                Font
                <select
                  value={el.font}
                  onChange={(e) => set({ font: e.target.value as "heading" | "body" })}
                >
                  <option value="heading">The look&rsquo;s headline font</option>
                  <option value="body">The look&rsquo;s text font</option>
                </select>
              </label>
            </>
          )}
          <label>
            Size (px; empty keeps the look&rsquo;s)
            <input
              type="number"
              min={8}
              max={400}
              value={el.size ?? ""}
              onChange={(e) =>
                set({
                  size:
                    e.target.value === ""
                      ? undefined
                      : Math.min(400, Math.max(8, Math.round(Number(e.target.value)))),
                })
              }
            />
          </label>
          <ColorField
            label="Color"
            value={el.color}
            allowNone
            onChange={(color) => set({ color })}
          />
          <label>
            Alignment
            <select
              value={el.align ?? ""}
              onChange={(e) =>
                set({
                  align: (e.target.value || undefined) as "left" | "center" | "right" | undefined,
                })
              }
            >
              <option value="">The look&rsquo;s</option>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </label>
        </>
      )}
      {el.type === "image" && (
        <>
          <label>
            Picture link (https)
            <input
              type="url"
              value={el.src}
              maxLength={2048}
              onChange={(e) =>
                e.target.value.startsWith("https://") && set({ src: e.target.value })
              }
            />
          </label>
          <label>
            Fit
            <select
              value={el.fit}
              onChange={(e) => set({ fit: e.target.value as "cover" | "contain" })}
            >
              <option value="contain">Whole picture</option>
              <option value="cover">Fill the box</option>
            </select>
          </label>
        </>
      )}
      {el.type === "shape" && (
        <>
          <label>
            Shape
            <select
              value={el.kind}
              onChange={(e) => set({ kind: e.target.value as "rect" | "ellipse" | "line" })}
            >
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="line">Line</option>
            </select>
          </label>
          <ColorField
            label="Fill"
            value={el.fill}
            allowNone={false}
            onChange={(fill) => fill && set({ fill })}
          />
          <ColorField
            label="Outline"
            value={el.stroke}
            allowNone
            onChange={(stroke) => set({ stroke })}
          />
          <NumberField
            label="Outline width"
            value={el.strokeWidth}
            min={0}
            max={40}
            onChange={(strokeWidth) => set({ strokeWidth })}
          />
          {el.kind === "rect" && (
            <NumberField
              label="Corner radius"
              value={el.radius}
              min={0}
              max={400}
              onChange={(radius) => set({ radius })}
            />
          )}
        </>
      )}
    </section>
  );
}
