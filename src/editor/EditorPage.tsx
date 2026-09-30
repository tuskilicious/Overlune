import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fromZoneInput, toZoneInput } from "../lib/time";
import { isHttpsUrl } from "../lib/url-safety";
import StartingSoon from "../overlays/starting/StartingSoon";
import TextScene from "../overlays/TextScene";
import { defaultSettings, socialPlatforms, type Settings } from "../settings/schema";
import { decodeLink, encode } from "../settings/url";
import { themes } from "../themes";
import { cleanSlate } from "../themes/clean-slate";
import { themeIds } from "../themes/types";
import { themeVars } from "../themes/vars";
import ObsLinks, { overlays, type OverlayId as Scene } from "./ObsLinks";
import "./editor.css";

type Platform = (typeof socialPlatforms)[number];

const platformNames: Record<Platform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  discord: "Discord",
};

const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeZones = Array.from(new Set(["UTC", browserTz, ...Intl.supportedValuesOf("timeZone")]));

/** Shows a 1920×1080 overlay scaled down to the width it's given. */
function Preview({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="editor-preview" ref={ref} style={{ "--scale": scale } as React.CSSProperties}>
      {children}
    </div>
  );
}

const loadedMessage = (ok: boolean) =>
  ok
    ? "Loaded! You can keep editing."
    : "Loaded, but some settings couldn’t be read, so defaults are showing for those.";

export default function EditorPage() {
  // A bookmarked editor link (/#1.…) opens with its settings.
  const [fromUrl] = useState(() => decodeLink(location.hash));
  const [settings, setSettings] = useState<Settings>(
    () =>
      fromUrl?.settings ?? {
        ...defaultSettings,
        starting: { ...defaultSettings.starting, tz: browserTz },
      },
  );
  const [scene, setScene] = useState<Scene>("starting");
  // Kept apart from settings so a half-typed or unsafe link never reaches the preview.
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [loadText, setLoadText] = useState("");
  const [loadStatus, setLoadStatus] = useState(fromUrl ? loadedMessage(fromUrl.ok) : "");

  // The address bar always holds the current settings, so bookmarking the editor saves the work.
  // replaceState: no history entry per keystroke. Sentry strips the fragment (lib/sentry-scrub.ts).
  useEffect(() => {
    history.replaceState(history.state, "", `#${encode(settings)}`);
  }, [settings]);

  const load = () => {
    const result = decodeLink(loadText);
    if (!result) {
      setLoadStatus(
        "That doesn’t look like an Overlune link. Copy one from “Links to paste into OBS”.",
      );
      return;
    }
    setSettings(result.settings);
    setLogoInput(result.settings.logo);
    setLoadText("");
    setLoadStatus(loadedMessage(result.ok));
  };

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const updateScene = <K extends Scene>(key: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  const updateSocial = (i: number, patch: Partial<Settings["socials"][number]>) =>
    update({ socials: settings.socials.map((s, j) => (i === j ? { ...s, ...patch } : s)) });

  const logoOk = logoInput === "" || isHttpsUrl(logoInput);
  const { starting } = settings;
  const current = settings[scene];

  return (
    <div className="editor" style={themeVars(cleanSlate)}>
      <header className="editor-header">
        <h1>Overlune</h1>
        <p>Free stream overlays that match. Pick a look, add your text, then paste into OBS.</p>
      </header>

      <section className="editor-save" aria-labelledby="save-heading">
        <h2 id="save-heading">Your link is your save file</h2>
        <p>
          Overlune has no accounts. Your overlay lives in its link.{" "}
          <strong>Bookmark this page</strong> or keep any of your OBS links, and paste it below to
          keep editing.
        </p>
        <form
          className="editor-load"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label>
            Load my overlay from a link
            <input
              value={loadText}
              placeholder="Paste a link from Overlune"
              onChange={(e) => setLoadText(e.target.value)}
            />
          </label>
          <button type="submit">Load</button>
        </form>
        <p className="editor-load-status" role="status">
          {loadStatus}
        </p>
      </section>

      <div className="editor-body">
        <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>Pick a look</legend>
            <div className="editor-themes">
              {themeIds.map((id) => (
                <label key={id} className="editor-theme">
                  <input
                    type="radio"
                    name="theme"
                    value={id}
                    checked={settings.theme === id}
                    onChange={() => update({ theme: id })}
                  />
                  <span
                    className="editor-swatch"
                    style={{ background: themes[id].bg, borderColor: themes[id].accent }}
                    aria-hidden
                  />
                  {themes[id].name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Scene to edit</legend>
            <div className="editor-scenes">
              {(Object.keys(overlays) as Scene[]).map((id) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="scene"
                    value={id}
                    checked={scene === id}
                    onChange={() => setScene(id)}
                  />
                  {overlays[id].name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{overlays[scene].name} text</legend>
            <label>
              Title
              <input
                value={current.title}
                maxLength={60}
                onChange={(e) => updateScene(scene, { title: e.target.value })}
              />
            </label>
            <label>
              Subtitle
              <input
                value={current.subtitle}
                maxLength={120}
                onChange={(e) => updateScene(scene, { subtitle: e.target.value })}
              />
            </label>
            {scene === "starting" && (
              <>
                <label>
                  Countdown ends at (leave empty for no countdown)
                  <input
                    type="datetime-local"
                    value={
                      starting.endsAt === null ? "" : toZoneInput(starting.endsAt, starting.tz)
                    }
                    onChange={(e) =>
                      updateScene("starting", {
                        endsAt: fromZoneInput(e.target.value, starting.tz),
                      })
                    }
                  />
                </label>
                <label>
                  Your time zone
                  <select
                    value={starting.tz}
                    onChange={(e) => {
                      // Keep the clock time the streamer typed; only its zone changes.
                      const typed =
                        starting.endsAt === null ? "" : toZoneInput(starting.endsAt, starting.tz);
                      updateScene("starting", {
                        tz: e.target.value,
                        endsAt: fromZoneInput(typed, e.target.value),
                      });
                    }}
                  >
                    {timeZones.map((tz) => (
                      <option key={tz}>{tz}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Message when the countdown ends
                  <input
                    value={starting.doneText}
                    maxLength={60}
                    onChange={(e) => updateScene("starting", { doneText: e.target.value })}
                  />
                </label>
              </>
            )}
          </fieldset>

          <fieldset>
            <legend>Your socials (shown on every scene)</legend>
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
                    onChange={(e) => updateSocial(i, { handle: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${platformNames[s.platform]} ${s.handle}`.trim()}
                  onClick={() => update({ socials: settings.socials.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            ))}
            {settings.socials.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  update({ socials: [...settings.socials, { platform: "twitch", handle: "" }] })
                }
              >
                Add a social
              </button>
            )}
          </fieldset>

          <fieldset>
            <legend>Logo (optional)</legend>
            <label>
              Link to your logo image (starts with https://)
              <input
                type="url"
                value={logoInput}
                maxLength={2048}
                aria-invalid={!logoOk}
                aria-describedby="logo-error"
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setLogoInput(v);
                  update({ logo: v === "" || isHttpsUrl(v) ? v : "" });
                }}
              />
            </label>
            <p id="logo-error" className="editor-error" role="alert">
              {!logoOk && "This link must start with https://"}
            </p>
          </fieldset>
        </form>

        <div className="editor-side">
          <section className="editor-preview-wrap" aria-label="Preview">
            <h2>Preview: {overlays[scene].name}</h2>
            <Preview>
              {scene === "starting" ? (
                <StartingSoon settings={settings} />
              ) : (
                <TextScene scene={scene} settings={settings} />
              )}
            </Preview>
          </section>
          <ObsLinks settings={settings} />
        </div>
      </div>
    </div>
  );
}
