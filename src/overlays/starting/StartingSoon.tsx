import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { formatCountdown, formatEndTime, secondsLeft } from "../../lib/time";
import { decode } from "../../settings/url";
import OverlayError from "../OverlayError";
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

export default function StartingSoon() {
  const { hash } = useLocation();
  // A damaged link still renders (bad fields fall back to defaults) and shows the error card.
  const { settings, ok } = useMemo(() => decode(hash), [hash]);
  const { title, subtitle, endsAt, tz, doneText } = settings.starting;
  const secs = useSecondsLeft(endsAt);

  return (
    <SceneFrame
      settings={settings}
      title={title}
      subtitle={subtitle}
      error={!ok && <OverlayError />}
    >
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
