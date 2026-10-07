import { localZone } from "../lib/time";
import { defaultSettings, type Settings } from "../settings/schema";
import type { ThemeId } from "../themes/types";

// Set once per page load and a day and a bit away, so the countdown shows days, hours and minutes and the
// pictures don't tick every second.
const endsAt = Date.now() + 26 * 3_600_000;
const tz = localZone();

/** Sample content for scene pictures (look cards, landing page), so each look shows its whole layout: a subtitle,
 *  the countdown card and socials, not just a title in an empty frame (T6.47). The streamer's own preview and
 *  links never use it. */
export const sampleScene = (theme: ThemeId): Settings => ({
  ...defaultSettings,
  theme,
  starting: { ...defaultSettings.starting, subtitle: "Chill games and good chat", endsAt, tz },
  brb: { ...defaultSettings.brb, subtitle: "Grabbing a drink" },
  ending: { ...defaultSettings.ending, subtitle: "See you next stream" },
  socials: [
    { platform: "twitch", handle: "yourname" },
    { platform: "youtube", handle: "yourname" },
  ],
});
