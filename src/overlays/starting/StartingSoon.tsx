import { useEffect, useState, type ReactNode } from "react";
import { formatCountdown, formatStartsAt, nextRepeatStart, secondsLeft } from "../../lib/time";
import type { Settings } from "../../settings/schema";
import SceneFrame from "../SceneFrame";
import "./starting.css";

/** The current time, whole seconds. React skips re-renders for an unchanged value, so this redraws once per second. */
function useNowSeconds(): number {
  const read = () => Math.floor(Date.now() / 1000) * 1000;
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function StartingSoon({
  settings,
  error,
}: {
  settings: Settings;
  error?: ReactNode;
}) {
  const { title, subtitle, tz, doneText, repeat } = settings.starting;
  const now = useNowSeconds();
  // Both are fixed by the link, so reloads and scene switches never reset the countdown.
  const endsAt =
    repeat.mode === "off" ? settings.starting.endsAt : nextRepeatStart(repeat, tz, now);
  const secs = endsAt === null ? null : secondsLeft(endsAt, now);

  return (
    <SceneFrame settings={settings} title={title} subtitle={subtitle} error={error}>
      {endsAt !== null && secs !== null && (
        <div className="countdown">
          {/* The light running round the card's edge (starting.css); decoration only. */}
          <span className="countdown-edge" aria-hidden="true" />
          {secs > 0 ? (
            <>
              <div className="countdown-time">
                {/* One span per character, keyed by its value: only the digits that change remount and flip in
                    (T6.117). */}
                {[...formatCountdown(secs)].map((ch, i) => (
                  <span key={`${i}${ch}`} className="countdown-ch">
                    {ch}
                  </span>
                ))}
              </div>
              <div className="countdown-at">{formatStartsAt(endsAt, tz, now)}</div>
            </>
          ) : (
            <div className="countdown-done">{doneText}</div>
          )}
        </div>
      )}
    </SceneFrame>
  );
}
