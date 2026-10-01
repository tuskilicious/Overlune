import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const q = createAlertQueue((a) => {
      setAlert(a);
      const { file, volume } = soundRef.current;
      if (a && file) playSound(file, volume);
    });
    queue.current = q;
    return () => q.stop();
  }, []);

  // The test link stops playing samples 15 minutes after it's copied (docs/STACK.md). Restamped every minute,
  // so it has about 15 minutes left however it's copied.
  const [until, setUntil] = useState(testLinkExpiry);
  useEffect(() => {
    const id = setInterval(() => setUntil(testLinkExpiry()), 60_000);
    return () => clearInterval(id);
  }, []);
  const testLink = `${location.origin}/o/alerts?test=1&until=${until}#${encode(settings)}`;

  return (
    <section className="editor-preview-wrap editor-alert-tester" aria-labelledby="alerts-preview">
      <h2 id="alerts-preview">Preview: Alerts</h2>
      <Preview>
        <AlertView settings={settings} alert={alert} />
      </Preview>
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
        <button type="button" disabled aria-describedby="coming-soon">
          Follow (coming soon)
        </button>
        <button type="button" disabled aria-describedby="coming-soon">
          Donation (coming soon)
        </button>
      </div>
      <p id="coming-soon" className="editor-hint">
        Follow and donation alerts need a Twitch login. They’re planned for a later version.
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
