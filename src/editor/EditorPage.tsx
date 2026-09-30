import { useEffect, useState } from "react";
import { fromZoneInput, toZoneInput } from "../lib/time";
import { isHttpsUrl } from "../lib/url-safety";
import StartingSoon from "../overlays/starting/StartingSoon";
import TextScene from "../overlays/TextScene";
import {
  defaultBots,
  defaultSettings,
  defaultTemplates,
  socialPlatforms,
  type Settings,
} from "../settings/schema";
import { loadSaved, save } from "../settings/storage";
import { decodeLink, encode } from "../settings/url";
import { themes } from "../themes";
import { cleanSlate } from "../themes/clean-slate";
import { contrast } from "../lib/contrast";
import { colorTokens, fontIds, themeIds, type ColorToken, type FontId } from "../themes/types";
import { applyOverrides, themeVars } from "../themes/vars";
import type { AlertKind } from "../alerts/events";
import ChatView from "../overlays/chat/ChatView";
import { botsFromInput } from "../overlays/chat/filters";
import { chatSamples } from "./chat-samples";
import { channelFromInput } from "../twitch/irc";
import AlertTester from "./AlertTester";
import ObsLinks, { overlays, type OverlayId as Scene } from "./ObsLinks";
import Preview from "./Preview";
import SiteFooter from "../components/SiteFooter";
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

const colorNames: Record<ColorToken, string> = {
  bg: "Background",
  surface: "Boxes and cards",
  primary: "Titles",
  accent: "Highlights",
  text: "Text",
  textMuted: "Softer text",
};

/** Color pickers only take #rrggbb; a theme gradient background shows as black until overridden. */
const asHex = (c: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#000000");

/** Whole-number box that lets you type freely and saves only values in range. Shows the saved value again on blur. */
function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  describedBy: string;
  onChange: (n: number) => void;
}) {
  const { label, value, min, max, describedBy, onChange } = props;
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    // Changed from outside (load, start over): show the new value.
    setShown(value);
    setText(String(value));
  }
  const inRange = (t: string) =>
    t.trim() !== "" && Number.isInteger(Number(t)) && Number(t) >= min && Number(t) <= max;
  const ok = inRange(text);
  const errorId = `${describedBy}-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={10}
        value={text}
        aria-invalid={!ok}
        aria-describedby={`${describedBy} ${errorId}`}
        onChange={(e) => {
          setText(e.target.value);
          if (inRange(e.target.value)) onChange(Number(e.target.value));
        }}
        onBlur={() => setText(String(value))}
      />
      <span id={errorId} className="editor-error" role="alert">
        {!ok && `Use a whole number from ${min} to ${max}.`}
      </span>
    </label>
  );
}

const alertFields: [AlertKind, string][] = [
  ["raid", "Raid message"],
  ["sub", "New sub message"],
  ["resub", "Resub message"],
  ["subgift", "Gift sub message"],
  ["bits", "Bits message"],
];

const fadeOptions = [
  [0, "Never"],
  [15, "15 seconds"],
  [30, "30 seconds"],
  [60, "1 minute"],
  [120, "2 minutes"],
] as const;

/** Keeps keyboard focus in place when the button that had it disappears (WCAG 2.4.3). Runs after React renders. */
const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

const loadedMessage = (ok: boolean) =>
  ok
    ? "Loaded! You can keep editing."
    : "Loaded, but some settings couldn’t be read, so defaults are showing for those.";

const freshSettings = (): Settings => ({
  ...defaultSettings,
  starting: { ...defaultSettings.starting, tz: browserTz },
});

/** Where the editor starts: a link in the address wins, then this browser's autosave, then defaults. */
function initialState(): { settings: Settings; status: string } {
  const fromUrl = decodeLink(location.hash);
  if (fromUrl) return { settings: fromUrl.settings, status: loadedMessage(fromUrl.ok) };
  const saved = loadSaved();
  if (saved)
    return {
      settings: saved.settings,
      status: saved.ok
        ? "Welcome back! We restored your last overlay from this browser."
        : "Welcome back! Some saved settings couldn’t be read, so defaults are showing for those.",
    };
  return { settings: freshSettings(), status: "" };
}

export default function EditorPage() {
  const [initial] = useState(initialState);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [scene, setScene] = useState<Scene>("starting");
  // Kept apart from settings so a half-typed or unsafe link never reaches the preview.
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [botsInput, setBotsInput] = useState(settings.chat.bots.join("\n"));
  const [loadText, setLoadText] = useState("");
  const [loadStatus, setLoadStatus] = useState(initial.status);
  const [confirmReset, setConfirmReset] = useState(false);

  // The address bar always holds the current settings, so bookmarking the editor saves the work.
  // replaceState: no history entry per keystroke. Sentry strips the fragment (lib/sentry-scrub.ts).
  useEffect(() => {
    history.replaceState(history.state, "", `#${encode(settings)}`);
    save(settings);
  }, [settings]);

  const startOver = () => {
    const fresh = freshSettings();
    setSettings(fresh);
    setLogoInput(fresh.logo);
    setBotsInput(fresh.chat.bots.join("\n"));
    setConfirmReset(false);
    focusSoon("start-over");
    setLoadStatus("Started over. Any link you kept still loads your old overlay.");
  };

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
    setBotsInput(result.settings.chat.bots.join("\n"));
    setLoadText("");
    setLoadStatus(loadedMessage(result.ok));
  };

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const updateScene = <K extends Scene>(key: K, patch: Partial<Settings[K]>) =>
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  const updateChat = (patch: Partial<Settings["chat"]>) =>
    setSettings((s) => ({ ...s, chat: { ...s.chat, ...patch } }));
  const updateTemplate = (kind: AlertKind, value: string) =>
    setSettings((s) => ({
      ...s,
      alerts: { ...s.alerts, templates: { ...s.alerts.templates, [kind]: value } },
    }));
  const updateSocial = (i: number, patch: Partial<Settings["socials"][number]>) =>
    update({ socials: settings.socials.map((s, j) => (i === j ? { ...s, ...patch } : s)) });

  const logoOk = logoInput === "" || isHttpsUrl(logoInput);
  const { starting } = settings;
  const current = settings[scene];

  const updateAdvanced = (patch: Partial<Settings["advanced"]>) =>
    setSettings((s) => ({ ...s, advanced: { ...s.advanced, ...patch } }));
  const look = applyOverrides(themes[settings.theme], settings.advanced);
  // Themes are checked for AA contrast in tests; only overrides can break it.
  const hardToRead =
    Object.keys(settings.advanced.colors).length > 0 &&
    (["text", "textMuted", "accent"] as const).some(
      (t) => contrast(asHex(look[t]), asHex(look.surface)) < 4.5,
    );

  return (
    <div className="editor" style={themeVars(cleanSlate)}>
      {/* No real #fragment jump: the address bar's fragment holds the settings. */}
      <a
        className="editor-skip"
        href="#obs-links"
        onClick={(e) => {
          e.preventDefault();
          const links = document.getElementById("obs-links");
          links?.scrollIntoView();
          links?.focus();
        }}
      >
        Skip to your OBS links
      </a>
      <header className="editor-header">
        <h1>Overlune</h1>
        <p>Free stream overlays that match. Pick a look, add your text, then paste into OBS.</p>
      </header>

      <section className="editor-save" aria-labelledby="save-heading">
        <h2 id="save-heading">Your link is your save file</h2>
        <p>
          Overlune has no accounts. Your overlay lives in its link.{" "}
          <strong>Bookmark this page</strong> or keep any of your OBS links, and paste it below to
          keep editing. Changes also save in this browser automatically.
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
        {confirmReset ? (
          <div className="editor-reset" role="group" aria-labelledby="reset-question">
            <span id="reset-question">
              Clear everything and start from the defaults? Keep your link first if you might want
              it back.
            </span>
            <button type="button" onClick={startOver}>
              Yes, start over
            </button>
            {/* Focus lands on the safe choice. */}
            <button
              type="button"
              autoFocus
              onClick={() => {
                setConfirmReset(false);
                focusSoon("start-over");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button id="start-over" type="button" onClick={() => setConfirmReset(true)}>
            Start over
          </button>
        )}
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
                  onClick={() => {
                    update({ socials: settings.socials.filter((_, j) => j !== i) });
                    focusSoon("add-social");
                  }}
                >
                  Remove
                </button>
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
          </fieldset>

          <fieldset>
            <legend>Chat</legend>
            <label>
              Your Twitch channel name
              <input
                value={settings.chat.channel}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="chat-hint"
                onChange={(e) => updateChat({ channel: channelFromInput(e.target.value) })}
              />
            </label>
            <p id="chat-hint" className="editor-hint">
              The name in your channel link, e.g. twitch.tv/<strong>yourname</strong>. You can paste
              the whole link.
            </p>
            <label className="editor-check">
              <input
                type="checkbox"
                checked={settings.chat.hideCommands}
                onChange={(e) => updateChat({ hideCommands: e.target.checked })}
              />
              Hide chat commands (messages starting with !)
            </label>
            <label>
              Bots to hide (one name per line)
              <textarea
                value={botsInput}
                rows={6}
                spellCheck={false}
                aria-describedby="bots-hint"
                onChange={(e) => {
                  setBotsInput(e.target.value);
                  updateChat({ bots: botsFromInput(e.target.value) });
                }}
              />
            </label>
            <p id="bots-hint" className="editor-hint">
              Messages from these accounts won’t show in your chat. Remove a name to show that bot.
            </p>
            <button
              id="reset-bots"
              type="button"
              onClick={() => {
                setBotsInput(defaultBots.join("\n"));
                updateChat({ bots: [...defaultBots] });
              }}
            >
              Reset to the usual bots
            </button>
            <div className="editor-size">
              <NumberField
                label="Chat box width"
                value={settings.chat.width}
                min={250}
                max={1920}
                describedBy="size-hint"
                onChange={(width) => updateChat({ width })}
              />
              <NumberField
                label="Chat box height"
                value={settings.chat.height}
                min={200}
                max={1080}
                describedBy="size-hint"
                onChange={(height) => updateChat({ height })}
              />
            </div>
            <p id="size-hint" className="editor-hint">
              Enter the same width and height in OBS. They’re shown next to the Chat link.
            </p>
            <label>
              Text size
              <select
                value={settings.chat.fontScale}
                onChange={(e) => updateChat({ fontScale: Number(e.target.value) })}
              >
                {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                  <option key={v} value={v}>
                    {v * 100}%
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hide messages after
              <select
                value={settings.chat.fadeAfter}
                onChange={(e) => updateChat({ fadeAfter: Number(e.target.value) })}
              >
                {fadeOptions.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Alerts</legend>
            <p id="alerts-hint" className="editor-hint">
              Alerts use your channel name from Chat. In each message, {"{user}"} becomes their name
              and {"{amount}"} the number. {"{s}"} adds an “s” unless the number is 1.
            </p>
            <label>
              Alert volume: {settings.alerts.volume}%
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.alerts.volume}
                aria-describedby="volume-hint"
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    alerts: { ...s.alerts, volume: Number(e.target.value) },
                  }))
                }
              />
            </label>
            <p id="volume-hint" className="editor-hint">
              0% turns the sound off. In OBS, tick “Control audio via OBS” on the Alerts source so
              your viewers hear it.
            </p>
            {alertFields.map(([kind, label]) => (
              <label key={kind}>
                {label}
                <input
                  value={settings.alerts.templates[kind]}
                  maxLength={100}
                  placeholder={defaultTemplates[kind]}
                  aria-describedby="alerts-hint"
                  onChange={(e) => updateTemplate(kind, e.target.value)}
                />
              </label>
            ))}
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

          <details className="editor-advanced">
            <summary id="advanced-summary">Advanced: colors and fonts</summary>
            <p className="editor-hint">
              The theme already looks good. Change these only if you want your own brand colors.
            </p>
            <fieldset>
              <legend>Colors</legend>
              {colorTokens.map((token) => (
                <div key={token} className="editor-color">
                  <label>
                    <input
                      id={`color-${token}`}
                      type="color"
                      value={asHex(look[token])}
                      onChange={(e) =>
                        updateAdvanced({
                          colors: { ...settings.advanced.colors, [token]: e.target.value },
                        })
                      }
                    />
                    {colorNames[token]}
                  </label>
                  {settings.advanced.colors[token] && (
                    <button
                      type="button"
                      aria-label={`Reset ${colorNames[token]} to the theme`}
                      onClick={() => {
                        const colors = { ...settings.advanced.colors };
                        delete colors[token];
                        updateAdvanced({ colors });
                        focusSoon(`color-${token}`);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              ))}
              <p className="editor-error" role="status">
                {hardToRead &&
                  "Your text may be hard to read on stream. Try a lighter text color or a darker “Boxes and cards” color."}
              </p>
            </fieldset>
            <fieldset>
              <legend>Fonts</legend>
              {(["fontHeading", "fontBody"] as const).map((key) => (
                <label key={key}>
                  {key === "fontHeading" ? "Heading font" : "Body font"}
                  <select
                    value={settings.advanced[key] ?? ""}
                    onChange={(e) =>
                      updateAdvanced({ [key]: (e.target.value || null) as FontId | null })
                    }
                  >
                    <option value="">Theme default ({themes[settings.theme][key]})</option>
                    {fontIds.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={() => {
                update({ advanced: { colors: {}, fontHeading: null, fontBody: null } });
                focusSoon("advanced-summary");
              }}
            >
              Reset all to the theme
            </button>
          </details>
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
          <section className="editor-preview-wrap editor-chat-preview" aria-label="Chat preview">
            <h2>Preview: Chat (sample messages)</h2>
            <Preview width={settings.chat.width} height={settings.chat.height}>
              <ChatView
                settings={{ ...settings, chat: { ...settings.chat, fadeAfter: 0 } }}
                messages={chatSamples}
              />
            </Preview>
          </section>
          <AlertTester settings={settings} />
          <ObsLinks settings={settings} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
