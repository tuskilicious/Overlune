import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { createAlertMapper, testAlerts, type AlertEvent } from "../../alerts/events";
import { createAlertQueue } from "../../alerts/queue";
import { playSound } from "../../alerts/sound";
import type { Settings } from "../../settings/schema";
import { themes } from "../../themes";
import { connectChat, type ChatStatus } from "../../twitch/irc";
import OverlayError from "../OverlayError";
import AlertView from "./AlertView";

/**
 * /o/alerts: alerts from the chat channel's events. `?test=1` plays one sample of each first and shows a
 * "Test mode" label. Newer test links add `&until=<unix seconds>`; after that the samples stop (docs/STACK.md).
 */
export default function Alerts({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const { channel } = settings.chat;
  const params = new URLSearchParams(useLocation().search);
  const test = params.get("test") === "1";
  // Absent: an old link, plays forever. Present but not a number counts as expired, so no fake alerts.
  const until = params.has("until") ? Number(params.get("until")) || 0 : null;
  const [alert, setAlert] = useState<AlertEvent | null>(null);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  // Read through a ref so changing the sound or volume never reconnects.
  const sound = { file: themes[settings.theme].alertSound, volume: settings.alerts.volume };
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  });

  useEffect(() => {
    const queue = createAlertQueue((a) => {
      setAlert(a);
      const { file, volume } = soundRef.current;
      if (a && file) playSound(file, volume);
    });
    const toAlert = createAlertMapper();
    // A tick later, so an effect that is set up and torn down at once (React dev mode) plays nothing.
    const playSamples = test && (until === null || Date.now() < until * 1000);
    const testTimer = playSamples
      ? setTimeout(() => testAlerts.forEach((a) => queue.push(a)))
      : undefined;
    const stop = connectChat(channel, {
      onStatus: setStatus,
      onEvent: (e) => {
        const a = toAlert(e);
        if (a) queue.push(a);
      },
    });
    return () => {
      stop();
      clearTimeout(testTimer);
      queue.stop();
    };
  }, [channel, test, until]);

  return (
    <AlertView
      settings={settings}
      alert={alert}
      error={
        <>
          {error}
          {test && (
            // Shows on stream on purpose: that's how a streamer notices they forgot to switch links.
            <p className="alerts-test-label">
              Test mode: switch back to your normal Alerts link before going live.
            </p>
          )}
          {channel === "" ? (
            <OverlayError
              title="Alerts need your channel name"
              message="Open Overlune, type your Twitch channel name under Chat, then copy a fresh “Link to paste into OBS”."
            />
          ) : (
            status === "error" && (
              <OverlayError
                title="Can’t connect to Twitch"
                message={`Check that “${channel}” is your Twitch channel name in Overlune. Alerts reconnect on their own.`}
              />
            )
          )}
        </>
      }
    />
  );
}
