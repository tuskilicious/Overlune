import { testAlerts, type AlertKind } from "../../alerts/events";
import { fillTemplate } from "../../alerts/templates";
import { defaultTemplates, type Settings } from "../../settings/schema";
import { CharsLeft, same, type SectionProps } from "./fields";

const alertFields: [AlertKind, string][] = [
  ["raid", "Raid message"],
  ["sub", "New sub message"],
  ["resub", "Resub message"],
  ["subgift", "Gift sub message"],
  ["bits", "Bits message"],
];

/** A message as it will read, filled in with the editor's sample alert (T6.19). */
const exampleAlert = (templates: Settings["alerts"]["templates"], kind: AlertKind) =>
  fillTemplate(
    templates,
    testAlerts.find((a) => a.kind === kind)!,
  )
    .map((p) => ("text" in p ? p.text : p.value))
    .join("");

/** Alert sound, how long each shows, and the messages. */
export default function Alerts({
  settings,
  setSettings,
  update,
  fresh,
  resetButton,
}: SectionProps) {
  const updateAlerts = (patch: Partial<Settings["alerts"]>) =>
    setSettings((s) => ({ ...s, alerts: { ...s.alerts, ...patch } }));
  const updateTemplate = (kind: AlertKind, value: string) =>
    setSettings((s) => ({
      ...s,
      alerts: { ...s.alerts, templates: { ...s.alerts.templates, [kind]: value } },
    }));
  /** Puts {user} or {amount} where the cursor was, so nobody has to type the codes (T6.19). */
  const insertInTemplate = (kind: AlertKind, token: string) => {
    const input = document.getElementById(`template-${kind}`) as HTMLInputElement;
    const typed = settings.alerts.templates[kind];
    const value = typed || defaultTemplates[kind]; // empty shows the default, so add to that
    const start = typed ? (input.selectionStart ?? value.length) : value.length;
    const end = typed ? (input.selectionEnd ?? start) : start;
    updateTemplate(kind, (value.slice(0, start) + token + value.slice(end)).slice(0, 100));
    const caret = Math.min(start + token.length, 100);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };
  return (
    <fieldset id="part-alerts" className="editor-part" tabIndex={-1}>
      <legend>Alerts</legend>
      {resetButton("Alerts", !same(settings.alerts, fresh.alerts), () =>
        update({ alerts: fresh.alerts }),
      )}
      <p className="editor-hint">
        Alerts use your channel name from Chat. Chat and alerts work with Twitch only; YouTube isn’t
        supported yet.
      </p>
      <label className="editor-slider">
        Alert volume
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={settings.alerts.volume}
          aria-describedby="volume-hint"
          onChange={(e) => updateAlerts({ volume: Number(e.target.value) })}
        />
        <output aria-hidden>{settings.alerts.volume}%</output>
      </label>
      <p id="volume-hint" className="editor-hint">
        0% turns the sound off. In OBS, tick “Control audio via OBS” on the Alerts source so your
        viewers hear it.
      </p>
      <label>
        Show each alert for
        <select
          value={settings.alerts.seconds}
          aria-describedby="alert-place-hint"
          onChange={(e) => updateAlerts({ seconds: Number(e.target.value) })}
        >
          {[3, 5, 8, 10, 15].map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </select>
      </label>
      {/* Streamers looked for position and size settings; those belong to the OBS source (T6.75). */}
      <p id="alert-place-hint" className="editor-hint">
        To change where alerts appear or how big they are, move and resize the Alerts source in OBS.
      </p>
      <details className="editor-more">
        <summary>Change alert messages</summary>
        <p id="alerts-hint" className="editor-hint">
          Type your message, and use the buttons to add their name or the amount. The example under
          each one shows how it will read.
        </p>
        {alertFields.map(([kind, label]) => (
          <div key={kind} className="editor-template">
            <label>
              {label}
              <input
                id={`template-${kind}`}
                value={settings.alerts.templates[kind]}
                maxLength={100}
                placeholder={defaultTemplates[kind]}
                aria-describedby={`alerts-hint template-${kind}-example chars-template-${kind}`}
                onChange={(e) => updateTemplate(kind, e.target.value)}
              />
            </label>
            <div className="editor-template-tools">
              <button
                type="button"
                aria-label={`Add their name to ${label}`}
                onClick={() => insertInTemplate(kind, "{user}")}
              >
                + Their name
              </button>
              {kind !== "sub" && (
                <button
                  type="button"
                  aria-label={`Add the amount to ${label}`}
                  onClick={() => insertInTemplate(kind, "{amount}")}
                >
                  + Amount
                </button>
              )}
            </div>
            <p id={`template-${kind}-example`} className="editor-hint">
              Example: {exampleAlert(settings.alerts.templates, kind)}
            </p>
            <CharsLeft
              id={`chars-template-${kind}`}
              value={settings.alerts.templates[kind]}
              max={100}
            />
          </div>
        ))}
        <p className="editor-hint">
          {"{user}"} and {"{amount}"} in a message are where the name and amount go.
          {" {s}"} adds an “s” when the amount isn’t 1.
        </p>
      </details>
    </fieldset>
  );
}
