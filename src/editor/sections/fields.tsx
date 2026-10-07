import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Settings } from "../../settings/schema";

/** What every editor section gets from EditorPage, which keeps the state, undo and the link. */
export type SectionProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  update: (patch: Partial<Settings>) => void;
  /** A fresh editor's settings, for the sections' Reset buttons. */
  fresh: Settings;
  /** A section's Reset (T6.120): shown only when `changed`. */
  resetButton: (what: string, changed: boolean, apply: () => void) => ReactNode;
};

/** Same settings, compared by value. */
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Keeps keyboard focus in place when the button that had it disappears (WCAG 2.4.3). Runs after React renders. */
export const focusSoon = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/** Whole-number box that lets you type freely and saves only values in range. Shows the saved value again on blur. */
export function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  describedBy: string;
  onChange: (n: number) => void;
}) {
  const { label, value, min, max, describedBy, onChange } = props;
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    // Changed from outside (load, start over): show the new value.
    setShown(value);
    setText(String(value));
  }
  const inRange = (t: string) =>
    t.trim() !== "" && Number.isInteger(Number(t)) && Number(t) >= min && Number(t) <= max;
  const ok = inRange(text);
  const errorId = `${describedBy}-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={10}
        value={text}
        aria-invalid={!ok}
        aria-describedby={`${describedBy} ${errorId}`}
        onChange={(e) => {
          setText(e.target.value);
          if (inRange(e.target.value)) onChange(Number(e.target.value));
        }}
        onBlur={() => setText(String(value))}
      />
      <span id={errorId} className="editor-error" role="alert">
        {!ok && `Use a whole number from ${min} to ${max}.`}
      </span>
    </label>
  );
}

/** "N characters left" once a limited field is nearly full, so text isn't cut off by surprise (T6.28). */
export function CharsLeft({ id, value, max }: { id: string; value: string; max: number }) {
  const left = max - value.length;
  return (
    <p id={id} className="editor-chars" aria-live="polite">
      {left <= 10 && `${left} character${left === 1 ? "" : "s"} left`}
    </p>
  );
}
