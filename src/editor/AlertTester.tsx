import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { testAlerts, type AlertEvent, type AlertKind } from "../alerts/events";
import { createAlertQueue } from "../alerts/queue";
import { playSound } from "../alerts/sound";
import AlertView from "../overlays/alerts/AlertView";
import type { Settings } from "../settings/schema";
import { encode } from "../settings/url";
import { themes } from "../themes";
import { LinkRow } from "./ObsLinks";
import Preview from "./Preview";

const buttons: [AlertKind, string][] = [
  ["raid", "Test raid"],
  ["sub", "Test sub"],
  ["resub", "Test resub"],
  ["subgift", "Test gift sub"],
  ["bits", "Test bits"],
];

/** Unix seconds 15 minutes from now. */
const testLinkExpiry = () => Math.floor(Date.now() / 1000) + 15 * 60;

/** "Preview: Alerts": test buttons play sample alerts through the real queue, sound included. */
export default function AlertTester({ settings }: { settings: Settings }) {
  const [alert, setAlert] = useState<AlertEvent | null>(null);
  const queue = useRef<ReturnType<typeof createAlertQueue> | null>(null);
  // The latest sound settings, read when an alert starts.
  const sound = { file: themes[settings.theme].alertSound, volume: settings.alerts.volume };
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  });

  // A new queue when the alert time changes, so test alerts last as long as they will on stream (T6.75).
  const seconds = settings.alerts.seconds;
  useEffect(() => {
    const q = createAlertQueue(
      (a) => {
        setAlert(a);
        const { file, volume } = soundRef.current;
        if (a && file) playSound(file, volume);
      },
      { durationMs: seconds * 1000 },
    );
    queue.current = q;
    return () => q.stop();
  }, [seconds]);

  // The test link stops playing samples 15 minutes after it's copied (docs/STACK.md). Restamped every minute,
  // so it has about 15 minutes left however it's copied.
  const [until, setUntil] = useState(testLinkExpiry);
  useEffect(() => {
    const id = setInterval(() => setUntil(testLinkExpiry()), 60_000);
    return () => clearInterval(id);
  }, []);
  const testLink = `${location.origin}/o/alerts?test=1&until=${until}#${encode(settings)}`;

  // The preview shows the top of the 1920×1080 canvas, down to just below the card: the alert sits at the top, so
  // the full canvas was mostly an empty box (T6.63). Layout sizes, so entrance animations don't move the crop.
  const canvas = useRef<HTMLDivElement>(null);
  const [cropHeight, setCropHeight] = useState(1080);
  useLayoutEffect(() => {
    const box = canvas.current?.querySelector<HTMLElement>(".alert-box");
    if (!box) return;
    const measure = () => setCropHeight(Math.min(1080, box.offsetTop + box.offsetHeight + 64));
    measure();
    const ro = new ResizeObserver(measure); // web fonts and long messages change the card's height
    ro.observe(box);
    return () => ro.disconnect();
  }, [alert, settings]);

  return (
    <section className="editor-preview-wrap editor-alert-tester" aria-labelledby="alerts-preview">
      <h2 id="alerts-preview">Preview: Alerts</h2>
      {/* Between test alerts, a still sample raid fills the box (T6.22); editor-shot turns its motion off. */}
      <div ref={canvas} className={alert ? undefined : "editor-shot"}>
        <Preview height={cropHeight}>
          <AlertView settings={settings} alert={alert ?? testAlerts[0]!} />
        </Preview>
      </div>
      <p className="editor-hint">
        This shows a sample raid. Press a test button to play an alert with its sound.
      </p>
      <div className="editor-test-buttons">
        {buttons.map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => queue.current?.push(testAlerts.find((a) => a.kind === kind)!)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="editor-hint">
        Follow and donation alerts are coming in a later version. They need a Twitch login.
      </p>
      <ul className="editor-test-link">
        <LinkRow
          id="alerts-test"
          name="Link to test your alerts in OBS"
          width={1920}
          height={1080}
          link={testLink}
        />
      </ul>
      <p className="editor-hint">
        This link plays one of each alert when OBS loads it, for 15 minutes after you copy it. Use
        it to check the position and sound. It shows “Test mode” on screen until you switch back to
        the normal Alerts link, so you can’t go live with it by mistake.
      </p>
    </section>
  );
}
