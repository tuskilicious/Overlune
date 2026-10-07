import Frame from "../../overlays/frame/Frame";
import type { Settings } from "../../settings/schema";
import FramePlacer from "../FramePlacer";
import Preview from "../Preview";
import { NumberField, same, type SectionProps } from "./fields";

/** Common webcam frame sizes (T6.118): 16:9 at three sizes, and 4:3. */
const frameSizes = [
  [480, 270],
  [640, 360],
  [800, 450],
  [640, 480],
] as const;

/** The webcam frame: its size, where it goes (T6.122) and its name tab. */
export default function WebcamFrame({
  settings,
  setSettings,
  update,
  fresh,
  resetButton,
}: SectionProps) {
  const updateFrame = (patch: Partial<Settings["frame"]>) =>
    setSettings((s) => ({ ...s, frame: { ...s.frame, ...patch } }));
  return (
    <fieldset id="part-frame" className="editor-part" tabIndex={-1}>
      <legend>Webcam frame</legend>
      {resetButton("Webcam frame", !same(settings.frame, fresh.frame), () =>
        update({ frame: fresh.frame }),
      )}
      <p className="editor-hint">
        A border in your look to put around your camera. In OBS, add its link as its own Browser
        source above your camera, and line the two up.
      </p>
      <div className="editor-size">
        <NumberField
          label="Frame width"
          value={settings.frame.width}
          min={160}
          max={1920}
          describedBy="frame-size-hint"
          onChange={(width) => updateFrame({ width })}
        />
        <NumberField
          label="Frame height"
          value={settings.frame.height}
          min={120}
          max={1080}
          describedBy="frame-size-hint"
          onChange={(height) => updateFrame({ height })}
        />
      </div>
      <div className="editor-quick" role="group" aria-label="Common camera sizes">
        {frameSizes.map(([w, h]) => (
          <button
            key={`${w}x${h}`}
            type="button"
            aria-pressed={settings.frame.width === w && settings.frame.height === h}
            onClick={() => updateFrame({ width: w, height: h })}
          >
            {w} × {h}
          </button>
        ))}
      </div>
      <p id="frame-size-hint" className="editor-hint">
        Make it the size of your camera in OBS. The numbers to enter in OBS are shown next to the
        Webcam frame link.
      </p>
      {/* Placed here, the frame link is full screen and lines up by itself (T6.122). */}
      <fieldset className="editor-segmented" aria-describedby="frame-place-hint">
        <legend>Where it goes</legend>
        {(
          [
            ["obs", "I'll move it in OBS"],
            ["here", "Place it here"],
          ] as const
        ).map(([where, label]) => (
          <label key={where}>
            <input
              type="radio"
              name="frame-place"
              checked={(settings.frame.x !== null) === (where === "here")}
              onChange={() =>
                updateFrame(
                  where === "here"
                    ? { x: 48, y: 1080 - settings.frame.height - 48 }
                    : { x: null, y: null },
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p id="frame-place-hint" className="editor-hint">
        {settings.frame.x !== null
          ? "Add the link in OBS full screen, 1920 × 1080, above your camera. Then line your camera up with the frame."
          : "Add the link in OBS at the frame's size, then drag it over your camera."}
      </p>
      {settings.frame.x !== null && (
        <FramePlacer frame={settings.frame} onMove={(at) => updateFrame(at)} />
      )}
      <label>
        Name on the frame (optional)
        <input
          value={settings.frame.label}
          maxLength={40}
          onChange={(e) => updateFrame({ label: e.target.value })}
        />
      </label>
      <div className="editor-frame-preview">
        <Preview width={settings.frame.width} height={settings.frame.height}>
          <Frame settings={settings} />
        </Preview>
      </div>
    </fieldset>
  );
}
