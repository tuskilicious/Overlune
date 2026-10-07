import { socialPlatforms, type Settings } from "../../settings/schema";
import { CharsLeft, focusSoon, same, type SectionProps } from "./fields";

type Platform = (typeof socialPlatforms)[number];

const platformNames: Record<Platform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  discord: "Discord",
};

/** Socials shown on every scene, and the ticker that scrolls them (T6.121). */
export default function Socials({ settings, update, fresh, resetButton }: SectionProps) {
  const updateSocial = (i: number, patch: Partial<Settings["socials"][number]>) =>
    update({ socials: settings.socials.map((s, j) => (i === j ? { ...s, ...patch } : s)) });
  return (
    <fieldset id="part-socials" className="editor-part" tabIndex={-1}>
      <legend>Your socials (shown on every scene)</legend>
      {resetButton(
        "Socials",
        settings.socials.length > 0 || !same(settings.ticker, fresh.ticker),
        () => update({ socials: [], ticker: fresh.ticker }),
      )}
      {settings.socials.map((s, i) => (
        <div key={i} className="editor-social">
          <label>
            Site
            <select
              value={s.platform}
              onChange={(e) => updateSocial(i, { platform: e.target.value as Platform })}
            >
              {socialPlatforms.map((p) => (
                <option key={p} value={p}>
                  {platformNames[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name or handle
            <input
              value={s.handle}
              maxLength={40}
              aria-describedby={`chars-social-${i}`}
              onChange={(e) => updateSocial(i, { handle: e.target.value })}
            />
          </label>
          <button
            type="button"
            aria-label={`Remove ${platformNames[s.platform]} ${s.handle}`.trim()}
            onClick={() => {
              update({ socials: settings.socials.filter((_, j) => j !== i) });
              focusSoon("add-social");
            }}
          >
            Remove
          </button>
          <CharsLeft id={`chars-social-${i}`} value={s.handle} max={40} />
        </div>
      ))}
      {settings.socials.length < 6 && (
        <button
          id="add-social"
          type="button"
          onClick={() =>
            update({ socials: [...settings.socials, { platform: "twitch", handle: "" }] })
          }
        >
          Add a social
        </button>
      )}
      {/* A ticker along the bottom of every scene (T6.121), after the Tuskilicious kit. */}
      <label className="editor-check">
        <input
          type="checkbox"
          checked={settings.ticker.show}
          aria-describedby="ticker-hint"
          onChange={(e) => update({ ticker: { ...settings.ticker, show: e.target.checked } })}
        />
        Scrolling ticker along the bottom of every scene
      </label>
      <p id="ticker-hint" className="editor-hint">
        Your socials scroll past, then an extra line if you add one: your schedule, a Discord invite
        or a catchphrase.
      </p>
      {settings.ticker.show && (
        <>
          <label>
            Ticker tab (optional)
            <input
              value={settings.ticker.label}
              maxLength={24}
              onChange={(e) => update({ ticker: { ...settings.ticker, label: e.target.value } })}
            />
          </label>
          <label>
            Extra line (optional)
            <input
              value={settings.ticker.extra}
              maxLength={120}
              onChange={(e) => update({ ticker: { ...settings.ticker, extra: e.target.value } })}
            />
          </label>
        </>
      )}
    </fieldset>
  );
}
