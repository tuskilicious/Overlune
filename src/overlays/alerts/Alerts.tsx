import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { createAlertMapper, testAlerts, type AlertEvent } from "../../alerts/events";
import { createAlertQueue } from "../../alerts/queue";
import type { Settings } from "../../settings/schema";
import { connectChat, type ChatStatus } from "../../twitch/irc";
import OverlayError from "../OverlayError";
import AlertView from "./AlertView";

/** /o/alerts: alerts from the chat channel's events. `?test=1` plays one sample of each first (docs/STACK.md). */
export default function Alerts({ settings, error }: { settings: Settings; error?: ReactNode }) {
  const { channel } = settings.chat;
  const test = new URLSearchParams(useLocation().search).get("test") === "1";
  const [alert, setAlert] = useState<AlertEvent | null>(null);
  const [status, setStatus] = useState<ChatStatus>("connecting");

  useEffect(() => {
    const queue = createAlertQueue(setAlert);
    const toAlert = createAlertMapper();
    if (test) testAlerts.forEach((a) => queue.push(a));
    const stop = connectChat(channel, {
      onStatus: setStatus,
      onEvent: (e) => {
        const a = toAlert(e);
        if (a) queue.push(a);
      },
    });
    return () => {
      stop();
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
