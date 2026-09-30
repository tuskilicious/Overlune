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

/** /o/alerts: alerts from the chat channel's events. `?test=1` plays one sample of each first (docs/STACK.md). */
export default function Alerts({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const { channel } = settings.chat;
  const test = new URLSearchParams(useLocation().search).get("test") === "1";
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
    const testTimer = test ? setTimeout(() => testAlerts.forEach((a) => queue.push(a))) : undefined;
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
  }, [channel, test]);

  return (
    <AlertView
      settings={settings}
      alert={alert}
      error={
        <>
          {error}
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
