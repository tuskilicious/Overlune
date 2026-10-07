import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { framePosition, type Settings } from "../settings/schema";

type Frame = Settings["frame"];

/** Gap from the canvas edge for the anchor buttons, inside the 64px safe margin's spirit. */
const EDGE = 48;
const anchors = [
  ["Top left", 0, 0],
  ["Top", 1, 0],
  ["Top right", 2, 0],
  ["Left", 0, 1],
  ["Middle", 1, 1],
  ["Right", 2, 1],
  ["Bottom left", 0, 2],
  ["Bottom", 1, 2],
  ["Bottom right", 2, 2],
] as const;

/** x or y for an anchor column/row: the edge gap, the middle, or the far edge minus the gap. */
const along = (step: 0 | 1 | 2, size: number, room: number) =>
  step === 0 ? EDGE : step === 1 ? Math.round((room - size) / 2) : room - size - EDGE;

/**
 * Where the webcam frame sits on the 1920×1080 stream (T6.122), after the ICARUS kit's cam pad: drag the box, nudge
 * it with the arrow keys (Shift for bigger steps), or pick one of nine spots.
 */
export default function FramePlacer({
  frame,
  onMove,
}: {
  frame: Frame;
  onMove: (at: { x: number; y: number }) => void;
}) {
  const pad = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const at = framePosition(frame) ?? { x: EDGE, y: 1080 - frame.height - EDGE };
  const clamp = (x: number, y: number) =>
    onMove({
      x: Math.round(Math.min(Math.max(0, x), 1920 - frame.width)),
      y: Math.round(Math.min(Math.max(0, y), 1080 - frame.height)),
    });

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: at.x, y: at.y };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const box = pad.current?.getBoundingClientRect();
    if (!d || !box) return;
    const scale = 1920 / box.width; // the pad is the stream, scaled down
    clamp(d.x + (e.clientX - d.px) * scale, d.y + (e.clientY - d.py) * scale);
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 8;
    const by = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!by) return;
    e.preventDefault();
    clamp(at.x + by[0]!, at.y + by[1]!);
  };

  return (
    <div className="frame-placer">
      <div className="frame-placer-pad" ref={pad}>
        <button
          type="button"
          className="frame-placer-box"
          aria-label={`Webcam frame position: ${at.x} across, ${at.y} down. Arrow keys move it.`}
          style={{
            left: `${(at.x / 1920) * 100}%`,
            top: `${(at.y / 1080) * 100}%`,
            width: `${(frame.width / 1920) * 100}%`,
            height: `${(frame.height / 1080) * 100}%`,
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={key}
        >
          Cam
        </button>
      </div>
      <div className="frame-placer-anchors" role="group" aria-label="Quick spots">
        {anchors.map(([name, col, row]) => (
          <button
            key={name}
            type="button"
            aria-label={`Move the frame to the ${name.toLowerCase()}`}
            onClick={() =>
              onMove({
                x: along(col, frame.width, 1920),
                y: along(row, frame.height, 1080),
              })
            }
          >
            {name}
          </button>
        ))}
      </div>
      <p className="editor-hint" aria-live="polite">
        {at.x} across, {at.y} down, {frame.width} × {frame.height}
      </p>
    </div>
  );
}
