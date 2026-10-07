import { useState } from "react";
import { fromZoneInput, localZone, toZoneInput, zoneName } from "../../lib/time";
import type { Settings } from "../../settings/schema";
import { overlays, type OverlayId as Scene } from "../ObsLinks";
import { CharsLeft, focusSoon, same, type SectionProps } from "./fields";

type RepeatMode = Settings["starting"]["repeat"]["mode"];

/** Monday first; values are JavaScript weekdays (0 = Sunday), as stored in the link. */
const weekdays = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;
const timeZones = Array.from(new Set(["UTC", localZone(), ...Intl.supportedValuesOf("timeZone")]));

/** The kinds of countdown, as a segmented control (T6.118). */
const repeatModes: [RepeatMode, string][] = [
  ["off", "One time"],
  ["daily", "Every day"],
  ["days", "On set days"],
];

/** Quick countdown picks (T6.113): label and minutes from now. */
const quickStarts = [
  ["In 15 min", 15],
  ["In 30 min", 30],
  ["In 1 hour", 60],
] as const;

/** Which scene to edit, then its text; Starting Soon adds the countdown. */
export default function SceneText({
  settings,
  setSettings,
  fresh,
  resetButton,
  scene,
  setScene,
}: SectionProps & { scene: Scene; setScene: (s: Scene) => void }) {
  /** The long time zone list stays hidden until "Change" (T6.11). */
  const [tzOpen, setTzOpen] = useState(false);
  const updateScene = <K extends Scene>(key: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  const current = settings[scene];
  const { starting } = settings;
  return (
    <>
      <fieldset id="part-scenes" className="editor-part" tabIndex={-1}>
        <legend>Scene to edit</legend>
        <div className="editor-scenes editor-segmented">
          {(Object.keys(overlays) as Scene[]).map((id) => (
            <label key={id}>
              <input
                type="radio"
                name="scene"
                value={id}
                checked={scene === id}
                onChange={() => setScene(id)}
              />
              {overlays[id].name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{overlays[scene].name} text</legend>
        {resetButton(`${overlays[scene].name} text`, !same(current, fresh[scene]), () =>
          updateScene(scene, fresh[scene]),
        )}
        <label>
          Title
          <input
            value={current.title}
            maxLength={60}
            aria-describedby="chars-title"
            onChange={(e) => updateScene(scene, { title: e.target.value })}
          />
        </label>
        <CharsLeft id="chars-title" value={current.title} max={60} />
        <label>
          Subtitle
          <input
            value={current.subtitle}
            maxLength={120}
            aria-describedby="chars-subtitle"
            onChange={(e) => updateScene(scene, { subtitle: e.target.value })}
          />
        </label>
        <CharsLeft id="chars-subtitle" value={current.subtitle} max={120} />
        {scene === "starting" && (
          <>
            {/* The kind of countdown comes first because it decides which time fields follow. Asking
                "repeat this countdown?" before any countdown was set read backwards (T6.50). */}
            {/* Three choices, all shown (T6.118): a drop-down hid two of them. */}
            <fieldset className="editor-segmented" aria-describedby="repeat-hint">
              <legend>Countdown</legend>
              {repeatModes.map(([mode, label]) => (
                <label key={mode}>
                  <input
                    type="radio"
                    name="repeat-mode"
                    value={mode}
                    checked={starting.repeat.mode === mode}
                    onChange={() =>
                      updateScene("starting", { repeat: { ...starting.repeat, mode } })
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p id="repeat-hint" className="editor-hint">
              &quot;Every day&quot; and &quot;On set days&quot; always count to your next stream, so
              you never re-paste the link into OBS.
            </p>
            {starting.repeat.mode === "off" ? (
              <>
                <label>
                  Countdown ends at (leave empty for no countdown)
                  <input
                    type="datetime-local"
                    value={
                      starting.endsAt === null ? "" : toZoneInput(starting.endsAt, starting.tz)
                    }
                    onChange={(e) =>
                      updateScene("starting", {
                        endsAt: fromZoneInput(e.target.value, starting.tz),
                      })
                    }
                  />
                </label>
                {/* Going live soon is the common case, and a date-time field is fiddly (T6.113). Whole
                    minutes, so the field shows exactly what was picked. */}
                <div className="editor-quick" role="group" aria-label="Quick countdown">
                  {quickStarts.map(([label, minutes]) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() =>
                        updateScene("starting", {
                          endsAt: Math.ceil((Date.now() + minutes * 60_000) / 60_000) * 60_000,
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                  {starting.endsAt !== null && (
                    <>
                      {/* A minute either way, like the kits' countdown controls (T6.118). */}
                      {(
                        [
                          ["−1 min", "1 minute earlier", -1],
                          ["+1 min", "1 minute later", 1],
                        ] as const
                      ).map(([label, name, step]) => (
                        <button
                          key={step}
                          type="button"
                          aria-label={`Countdown ${name}`}
                          onClick={() =>
                            updateScene("starting", {
                              endsAt: (starting.endsAt ?? 0) + step * 60_000,
                            })
                          }
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateScene("starting", { endsAt: null })}
                      >
                        No countdown
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {starting.repeat.mode === "days" && (
                  <fieldset className="editor-days">
                    <legend>Stream days</legend>
                    {weekdays.map(([day, name]) => (
                      <label key={day} className="editor-check">
                        <input
                          type="checkbox"
                          checked={starting.repeat.days.includes(day)}
                          onChange={(e) =>
                            updateScene("starting", {
                              repeat: {
                                ...starting.repeat,
                                days: e.target.checked
                                  ? [...starting.repeat.days, day].sort()
                                  : starting.repeat.days.filter((d) => d !== day),
                              },
                            })
                          }
                        />
                        {name}
                      </label>
                    ))}
                  </fieldset>
                )}
                <label>
                  Stream starts at
                  <input
                    type="time"
                    value={starting.repeat.time}
                    onChange={(e) =>
                      // Clearing the field would make an invalid time, so keep the last good one.
                      e.target.value &&
                      updateScene("starting", {
                        repeat: { ...starting.repeat, time: e.target.value },
                      })
                    }
                  />
                </label>
              </>
            )}
            <p className="editor-tz">
              Your time zone: {zoneName(starting.tz)} ({starting.tz})
              {!tzOpen && (
                <button
                  type="button"
                  aria-label="Change time zone"
                  onClick={() => {
                    setTzOpen(true);
                    focusSoon("tz-select");
                  }}
                >
                  Change
                </button>
              )}
            </p>
            {/* Stays open once shown: a closed select changes on every arrow key, so closing on change would trap keyboard users. */}
            {tzOpen && (
              <label>
                Your time zone
                <select
                  id="tz-select"
                  value={starting.tz}
                  onChange={(e) => {
                    // Keep the clock time the streamer typed; only its zone changes.
                    const typed =
                      starting.endsAt === null ? "" : toZoneInput(starting.endsAt, starting.tz);
                    updateScene("starting", {
                      tz: e.target.value,
                      endsAt: fromZoneInput(typed, e.target.value),
                    });
                  }}
                >
                  {timeZones.map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Message when the countdown ends
              <input
                value={starting.doneText}
                maxLength={60}
                aria-describedby="chars-done"
                onChange={(e) => updateScene("starting", { doneText: e.target.value })}
              />
            </label>
            <CharsLeft id="chars-done" value={starting.doneText} max={60} />
          </>
        )}
      </fieldset>
    </>
  );
}
