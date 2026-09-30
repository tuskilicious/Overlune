import { useEffect, useState, type ReactNode } from "react";
import { formatCountdown, formatEndTime, secondsLeft } from "../../lib/time";
import type { Settings } from "../../settings/schema";
import SceneFrame from "../SceneFrame";
import "./starting.css";

/** Counts down to a fixed instant from the link, so reloads and scene switches never reset it. */
function useSecondsLeft(endsAt: number | null): number | null {
  const [secs, setSecs] = useState(() =>
    endsAt === null ? null : secondsLeft(endsAt, Date.now()),
  );
  useEffect(() => {
    if (endsAt === null) return;
    // React skips the re-render when the value is unchanged, so this redraws once per second.
    const tick = () => setSecs(secondsLeft(endsAt, Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return secs;
}

export default function StartingSoon({
  settings,
  error,
}: {
  settings: Settings;
  error?: ReactNode;
}) {
  const { title, subtitle, endsAt, tz, doneText } = settings.starting;
  const secs = useSecondsLeft(endsAt);

  return (
    <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error}>
      {endsAt !== null && secs !== null && (
        <div className="countdown">
          {secs > 0 ? (
            <>
              <div className="countdown-time">{formatCountdown(secs)}</div>
              <div className="countdown-at">Starts at {formatEndTime(endsAt, tz)}</div>
            </>
          ) : (
            <div className="countdown-done">{doneText}</div>
          )}
        </div>
      )}
    </SceneFrame>
  );
}
