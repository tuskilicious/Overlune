import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router";
import { fromZoneInput, localZone, toZoneInput, zoneName } from "../lib/time";
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
import { brandChrome } from "./brand";
import { contrast } from "../lib/contrast";
import {
  colorTokens,
  fontIds,
  themeIds,
  type ColorToken,
  type FontId,
  type ThemeId,
} from "../themes/types";
import { applyOverrides, themeVars } from "../themes/vars";
import { testAlerts, type AlertKind } from "../alerts/events";
import { fillTemplate } from "../alerts/templates";
import ChatView from "../overlays/chat/ChatView";
import Frame from "../overlays/frame/Frame";
import { botsFromInput } from "../overlays/chat/filters";
import { chatSamples } from "./chat-samples";
import { channelFromInput } from "../twitch/irc";
import AlertTester from "./AlertTester";
import ChannelPage from "./ChannelPage";
import ObsLinks, { overlays, type OverlayId as Scene } from "./ObsLinks";
import FramePlacer from "./FramePlacer";
import Preview from "./Preview";
import { sampleScene } from "./scene-samples";
import SiteFooter from "../components/SiteFooter";
import "./editor.css";
import Icon from "../components/Icon";

type Platform = (typeof socialPlatforms)[number];

const platformNames: Record<Platform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  discord: "Discord",
};

const browserTz = localZone();
type RepeatMode = Settings["starting"]["repeat"]["mode"];
/** Monday first; values are JavaScript weekdays (0 = Sunday), as stored in the link. */
const weekdays = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;
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

/** A message as it will read, filled in with the editor's sample alert (T6.19). */
const exampleAlert = (templates: Settings["alerts"]["templates"], kind: AlertKind) =>
  fillTemplate(
    templates,
    testAlerts.find((a) => a.kind === kind)!,
  )
    .map((p) => ("text" in p ? p.text : p.value))
    .join("");

const fadeOptions = [
  [0, "Never"],
  [15, "15 seconds"],
  [30, "30 seconds"],
  [60, "1 minute"],
  [120, "2 minutes"],
] as const;

/** Keeps keyboard focus in place when the button that had it disappears (WCAG 2.4.3). Runs after React renders. */
const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

/** Scrolls to a section and moves focus there. No real #fragment jump: the address bar's fragment holds the settings. */
const jumpTo = (e: MouseEvent, id: string) => {
  e.preventDefault();
  const target = document.getElementById(id);
  // A smooth scroll shows where the section is (T6.103); reduced motion jumps straight there.
  const still =
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    "rm" in document.documentElement.dataset;
  target?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
  target?.focus({ preventScroll: true });
};

/** The editor's three steps (T6.18), in the steps bar and as section headings. */
const steps = [
  ["step-look", "1. Pick a look"],
  ["step-details", "2. Add your details"],
  ["obs-links", "3. Links to paste into OBS"],
] as const;

/** Wide windows (T6.60): the section list on the left. Each jumps to its place in the settings column. */
const sections = [
  ["step-look", "Look"],
  ["part-scenes", "Text"],
  ["part-socials", "Socials"],
  ["part-chat", "Chat"],
  ["part-alerts", "Alerts"],
  ["part-frame", "Webcam frame"],
  ["part-channel", "Channel page"],
  ["part-logo", "Logo"],
  ["part-motion", "Motion"],
  ["part-colors", "Colors"],
  ["obs-links", "Links"],
] as const;

/** How much moves in the overlays (T6.119). */
const motionLevels = [
  ["full", "Full"],
  ["lite", "Lite"],
  ["still", "Still"],
] as const;

const motionHints = {
  full: "Everything moves: entrances, countdown flips, alerts and the moving backgrounds.",
  lite: "Entrances, countdown flips and alerts still move; moving backgrounds stop. Good for a slower PC.",
  still:
    "Nothing moves: no entrances and no moving backgrounds. Good if movement bothers you or your viewers.",
} as const;

/** The kinds of countdown, as a segmented control (T6.118). */
const repeatModes: [RepeatMode, string][] = [
  ["off", "One time"],
  ["daily", "Every day"],
  ["days", "On set days"],
];

/** Common webcam frame sizes (T6.118): 16:9 at three sizes, and 4:3. */
const frameSizes = [
  [480, 270],
  [640, 360],
  [800, 450],
  [640, 480],
] as const;

/** Quick countdown picks (T6.113): label and minutes from now. */
const quickStarts = [
  ["In 15 min", 15],
  ["In 30 min", 30],
  ["In 1 hour", 60],
] as const;

/** Look filters (T6.60). Each look is in one group. */
const moods = {
  Calm: ["clean-slate", "cozy-cafe", "pastel-cloud", "forest-night", "daylight", "abyss", "sakura"],
  Retro: ["arcade-8bit", "vaporwave-sunset", "session", "phosphor"],
  Bold: ["neon-grid", "bold-esports", "shonen", "skate-deck", "quest"],
} as const satisfies Record<string, readonly ThemeId[]>;
type Mood = keyof typeof moods | "All";

/** The preview that goes with a section, brought into view in the center column (T6.60). */
const sectionPreview: Partial<Record<string, string>> = {
  "part-chat": ".editor-chat-preview",
  "part-alerts": ".editor-alert-tester",
};

const loadedMessage = (ok: boolean) =>
  ok
    ? "Loaded. You can keep editing."
    : "Loaded, but some settings couldn’t be read, so defaults are showing for those.";

const freshSettings = (): Settings => ({
  ...defaultSettings,
  starting: { ...defaultSettings.starting, tz: browserTz },
});
const freshJson = JSON.stringify(freshSettings());

/** Where each ?part= value lands (T6.59). */
const partTargets: Record<string, string> = {
  starting: "part-scenes",
  brb: "part-scenes",
  ending: "part-scenes",
  chat: "part-chat",
  alerts: "part-alerts",
  frame: "part-frame",
};

/** Survives a trip to the setup guide and back, so the gallery isn't shown twice in one visit. */
let pickedThisVisit = false;

/** Each theme's Starting Soon scene with sample content, for the picture cards (T6.16, T6.17, T6.47). */
const shots = Object.fromEntries(themeIds.map((id) => [id, sampleScene(id)])) as Record<
  ThemeId,
  Settings
>;

/** A theme's Starting Soon scene as a still picture: animations stay off (editor.css), so 8 cards stay light. */
const ThemeShot = ({ id }: { id: ThemeId }) => (
  <span className="editor-shot">
    <Preview>
      <StartingSoon settings={shots[id]} />
    </Preview>
  </span>
);

/** Where the editor starts: a link in the address wins, then this browser's autosave, then defaults. */
/** "N characters left" once a limited field is nearly full, so text isn't cut off by surprise (T6.28). */
function CharsLeft({ id, value, max }: { id: string; value: string; max: number }) {
  const left = max - value.length;
  return (
    <p id={id} className="editor-chars" aria-live="polite">
      {left <= 10 && `${left} character${left === 1 ? "" : "s"} left`}
    </p>
  );
}

function initialState(): { settings: Settings; status: string } {
  const fromUrl = decodeLink(location.hash);
  if (fromUrl) return { settings: fromUrl.settings, status: loadedMessage(fromUrl.ok) };
  const saved = loadSaved();
  if (saved)
    return {
      settings: saved.settings,
      status: saved.ok
        ? "Welcome back. We restored your last overlay from this browser."
        : "Welcome back. Some saved settings couldn’t be read, so defaults are showing for those.",
    };
  return { settings: freshSettings(), status: "" };
}

export default function EditorPage() {
  const [initial] = useState(initialState);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  /** A landing-page card can open one part of the editor: /editor?part=brb (T6.59). Read once. */
  const [part] = useState(() => new URLSearchParams(location.search).get("part"));
  const [scene, setScene] = useState<Scene>(
    part === "brb" || part === "ending" ? part : "starting",
  );
  /** Narrow windows only: whether the docked preview is expanded. */
  const [previewOpen, setPreviewOpen] = useState(false);
  /** The long time zone list stays hidden until "Change" (T6.11). */
  const [tzOpen, setTzOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  // Kept apart from settings so a half-typed or unsafe link never reaches the preview.
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [botsInput, setBotsInput] = useState(settings.chat.bots.join("\n"));
  const [loadText, setLoadText] = useState("");
  const [loadStatus, setLoadStatus] = useState(initial.status);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mood, setMood] = useState<Mood>("All");
  /** The logo link is https: but no picture loaded from it (T6.21). */
  const [logoBroken, setLogoBroken] = useState(false);
  /** The editor shows instead of the welcome gallery (T6.16). Decided once, so setting everything back to the
   *  defaults never swaps the editor out from under the streamer. Picking Clean Slate changes no setting. */
  const [started, setStarted] = useState(
    () => pickedThisVisit || JSON.stringify(initial.settings) !== freshJson,
  );

  // The address bar always holds the current settings, so bookmarking the editor saves the work.
  // replaceState: no history entry per keystroke. Sentry strips the fragment (lib/sentry-scrub.ts).
  useEffect(() => {
    history.replaceState(history.state, "", `#${encode(settings)}`);
    save(settings);
  }, [settings]);

  /** Undo (T6.115): earlier settings, newest last. A burst of edits (typing a title) is one step. */
  const [past, setPast] = useState<Settings[]>([]);
  const shown = useRef(settings);
  const lastEdit = useRef(0);
  const undoing = useRef(false);
  useEffect(() => {
    if (settings === shown.current) return;
    const before = shown.current;
    shown.current = settings;
    if (undoing.current) {
      undoing.current = false;
      return;
    }
    // The same settings in a new object (picking the look already shown) is no step.
    if (JSON.stringify(before) === JSON.stringify(settings)) return;
    const now = Date.now();
    // ponytail: 50 steps of whole snapshots; settings are a few kB, so diffs aren't worth it
    if (now - lastEdit.current > 1000) setPast((p) => [...p.slice(-49), before]);
    lastEdit.current = now;
  }, [settings]);
  const undo = useCallback(() => {
    const before = past.at(-1);
    if (!before) return;
    undoing.current = true;
    setPast(past.slice(0, -1));
    setSettings(before);
    setLogoInput(before.logo);
    setBotsInput(before.chat.bots.join("\n"));
    setLoadStatus("Undone.");
  }, [past]);
  // Ctrl+Z / Cmd+Z outside text fields; inside one, the browser's own undo works on the text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z")
        return;
      const t = e.target;
      const typing =
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable) ||
        (t instanceof HTMLInputElement &&
          !["checkbox", "radio", "range", "color", "button", "submit"].includes(t.type));
      if (typing || !past.length) return;
      e.preventDefault();
      undo();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [undo, past.length]);

  const startOver = () => {
    const fresh = freshSettings();
    setSettings(fresh);
    setLogoInput(fresh.logo);
    setBotsInput(fresh.chat.bots.join("\n"));
    setConfirmReset(false);
    focusSoon("load-toggle"); // "Start over" disappears with nothing left to clear
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
  const updateFrame = (patch: Partial<Settings["frame"]>) =>
    setSettings((s) => ({ ...s, frame: { ...s.frame, ...patch } }));
  const updateTemplate = (kind: AlertKind, value: string) =>
    setSettings((s) => ({
      ...s,
      alerts: { ...s.alerts, templates: { ...s.alerts.templates, [kind]: value } },
    }));
  /** Puts {user} or {amount} where the cursor was, so nobody has to type the codes (T6.19). */
  const insertInTemplate = (kind: AlertKind, token: string) => {
    const input = document.getElementById(`template-${kind}`) as HTMLInputElement;
    const typed = settings.alerts.templates[kind];
    const value = typed || defaultTemplates[kind]; // empty shows the default, so add to that
    const start = typed ? (input.selectionStart ?? value.length) : value.length;
    const end = typed ? (input.selectionEnd ?? start) : start;
    updateTemplate(kind, (value.slice(0, start) + token + value.slice(end)).slice(0, 100));
    const caret = Math.min(start + token.length, 100);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };
  const updateSocial = (i: number, patch: Partial<Settings["socials"][number]>) =>
    update({ socials: settings.socials.map((s, j) => (i === j ? { ...s, ...patch } : s)) });

  const logoOk = logoInput === "" || isHttpsUrl(logoInput);
  const { starting } = settings;
  /** Anything changed from a fresh editor, including work restored from a link or autosave. */
  const madeSomething = JSON.stringify(settings) !== freshJson;
  const motion = settings.lessMotion ? "still" : settings.liteMotion ? "lite" : "full";
  /** A section's Reset (T6.120), after the kits' docks: shown only when the section differs from the defaults.
   *  Undo brings it back, so there's no confirm step. */
  const fresh = freshSettings();
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const resetButton = (what: string, changed: boolean, apply: () => void) =>
    changed && (
      <button
        type="button"
        className="editor-reset"
        aria-label={`Reset ${what}`}
        onClick={() => {
          lastEdit.current = 0; // a reset is always its own undo step, never part of a typing burst
          apply();
          setLoadStatus(`${what} reset. Undo brings it back.`);
        }}
      >
        Reset
      </button>
    );
  const filled: Partial<Record<string, boolean>> = {
    "part-socials": settings.socials.some((s) => s.handle.trim()),
    "part-chat": settings.chat.channel !== "",
    "part-logo": settings.logo !== "",
    "part-colors":
      Object.keys(settings.advanced.colors).length > 0 ||
      !!settings.advanced.fontHeading ||
      !!settings.advanced.fontBody,
  };
  /** First visit: a gallery of looks comes before the editor (T6.16). Saved or loaded work skips it. */
  const welcome = !started;

  /** The step whose heading has scrolled past the top third of the window, shown in the steps bar (T6.32). */
  const [currentStep, setCurrentStep] = useState<string>(steps[0][0]);
  /** The same for the section list on wide windows (T6.60). */
  const [currentSection, setCurrentSection] = useState<string>(sections[0][0]);
  useEffect(() => {
    if (welcome) return;
    const update = () => {
      const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      const above = (id: string, line: number) =>
        (document.getElementById(id)?.getBoundingClientRect().top ?? 0) < line;
      const passed = steps.filter(([id]) => above(id, innerHeight / 3));
      setCurrentStep(atBottom ? steps[2][0] : (passed.at(-1) ?? steps[0])[0]);
      // Sections are often short: with the steps' line a third of the way down, the section after one you jumped
      // to had passed it too and was marked instead. A jump puts a section 16px from the top (scroll-margin), so
      // the section at the top of the window is the last one past 48px (T6.62).
      const passedSection = sections.filter(([id]) => above(id, 48));
      setCurrentSection(atBottom ? "obs-links" : (passedSection.at(-1) ?? sections[0])[0]);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, [welcome]);
  // Bring that part into view once the editor shows (after the gallery on a first visit).
  useEffect(() => {
    const target = part && partTargets[part];
    if (welcome || !target) return;
    requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ block: "start" }),
    );
  }, [welcome, part]);
  // Wide windows: the center column shows the preview that goes with the section on screen (chat, alerts),
  // and the scene preview otherwise (T6.60).
  useEffect(() => {
    const side = document.querySelector<HTMLElement>(".editor-side");
    if (welcome || !side || !matchMedia("(min-width: 1200px)").matches) return;
    const target = sectionPreview[currentSection];
    const el = target ? side.querySelector<HTMLElement>(target) : null;
    side.scrollTo({ top: el ? el.offsetTop - 4 : 0 });
  }, [welcome, currentSection]);
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
    <div className="editor" style={themeVars(brandChrome)}>
      {/* No real #fragment jump: the address bar's fragment holds the settings. */}
      <a
        hidden={welcome}
        className="editor-skip"
        href="#obs-links"
        onClick={(e) => jumpTo(e, "obs-links")}
      >
        Skip to your OBS links
      </a>
      <header className="editor-header">
        {/* The logo leads home, as on the guide and legal pages (T6.67). */}
        <h1>
          <Link to="/">
            <img src="/images/brand/logo.png" alt="Overlune home" width="159" height="48" />
          </Link>
        </h1>
        {/* The primary tagline from docs/BRAND.md, then what to do (T6.33). */}
        <p>
          <strong className="editor-tagline">Free stream overlays that look pro.</strong> Pick a
          look, add your text, then paste into OBS.
        </p>
      </header>

      {/* One quiet line until something is made, then the bookmark reminder leads (T6.12). */}
      <section
        className="editor-save"
        aria-labelledby="save-heading"
        data-made={madeSomething || undefined}
        // Escape closes whichever panel is open, wherever focus is in the box: right after a click, focus
        // reaches the panel a frame later, and an Escape in between was lost (T6.58).
        onKeyDown={(e) => {
          if (e.key !== "Escape" || !(loadOpen || confirmReset)) return;
          focusSoon(loadOpen ? "load-toggle" : "start-over");
          setLoadOpen(false);
          setConfirmReset(false);
        }}
      >
        <div className="editor-save-text">
          {madeSomething && (
            <p className="editor-save-lead">Bookmark this page to keep your overlay.</p>
          )}
          <div>
            <h2 id="save-heading">Your link is your save file.</h2>{" "}
            {madeSomething ? "Changes also save in this browser." : "No accounts needed."}
          </div>
        </div>
        {/* The buttons stay put; each opens its own panel underneath, one at a time, and Escape closes it (T6.58). */}
        <div className="editor-save-actions">
          {/* The editor link is the save file; this keeps it somewhere other than the browser (T6.70). */}
          {madeSomething && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href);
                  setLoadStatus(
                    "Save link copied. Keep it in a note or bookmark, and paste it into Load to come back.",
                  );
                } catch {
                  setLoadStatus("Copy the address from your browser’s address bar to keep it.");
                }
              }}
            >
              Copy my save link
            </button>
          )}
          <button
            id="load-toggle"
            type="button"
            aria-expanded={loadOpen}
            aria-controls="load-form"
            onClick={() => {
              setConfirmReset(false);
              setLoadOpen((o) => !o);
              if (!loadOpen) focusSoon("load-input");
            }}
          >
            Load my overlay from a link
          </button>
          {past.length > 0 && (
            <button type="button" onClick={undo} aria-keyshortcuts="Control+Z">
              Undo
            </button>
          )}
          {madeSomething && (
            <button
              id="start-over"
              type="button"
              aria-expanded={confirmReset}
              aria-controls="reset-panel"
              onClick={() => {
                setLoadOpen(false);
                setConfirmReset((c) => !c);
                // Focus lands on the safe choice.
                if (!confirmReset) focusSoon("reset-cancel");
              }}
            >
              Start over
            </button>
          )}
        </div>
        <form
          id="load-form"
          className="editor-load"
          hidden={!loadOpen}
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label>
            Paste a link from Overlune
            <input
              id="load-input"
              value={loadText}
              placeholder="Your overlay or editor link"
              onChange={(e) => setLoadText(e.target.value)}
            />
          </label>
          <button type="submit">Load</button>
        </form>
        {madeSomething && (
          <div
            id="reset-panel"
            className="editor-reset"
            role="group"
            aria-labelledby="reset-question"
            hidden={!confirmReset}
          >
            <span id="reset-question">
              Clear everything and start from the defaults? Keep your link first if you might want
              it back.
            </span>
            <button type="button" onClick={startOver}>
              Yes, start over
            </button>
            <button
              id="reset-cancel"
              type="button"
              onClick={() => {
                setConfirmReset(false);
                focusSoon("start-over");
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <p className="editor-load-status" role="status">
          {loadStatus}
        </p>
      </section>

      {welcome ? (
        <section className="editor-welcome" aria-labelledby="welcome-heading">
          <h2 id="welcome-heading">Pick a look to start</h2>
          <p>
            Each look comes with matching Starting Soon, Be Right Back and Stream Ending screens,
            chat and alerts. You can switch any time.
          </p>
          <ul className="editor-welcome-looks">
            {themeIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="editor-card"
                  onClick={() => {
                    update({ theme: id });
                    pickedThisVisit = true;
                    setStarted(true);
                    // Open at the top with the preview in view; focus still lands on the picked look (T6.29).
                    requestAnimationFrame(() => {
                      document.getElementById(`theme-${id}`)?.focus({ preventScroll: true });
                      if (!part) scrollTo(0, 0); // ?part= scrolls to its own place
                    });
                  }}
                >
                  <ThemeShot id={id} />
                  {themes[id].name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <nav className="editor-steps" aria-label="Steps">
            <ol>
              {steps.map(([id, name]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={currentStep === id ? "step" : undefined}
                    onClick={(e) => jumpTo(e, id)}
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="editor-body">
            {/* Wide windows only (editor.css); narrower ones use the steps bar above. */}
            <nav className="editor-rail" aria-label="Sections">
              <ol>
                {sections.map(([id, name]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      aria-current={currentSection === id ? "location" : undefined}
                      onClick={(e) => {
                        const colors = document.getElementById("part-colors");
                        if (id === "part-colors" && colors instanceof HTMLDetailsElement)
                          colors.open = true;
                        jumpTo(e, id);
                      }}
                    >
                      {name}
                      {/* What's already filled in, at a glance, as the kits' docks show their status (T6.118). */}
                      {filled[id] && (
                        <span className="editor-rail-set">
                          <Icon name="check" />
                          <span className="editor-sep"> (filled in)</span>
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
              <h2 id="step-look" className="editor-step" tabIndex={-1}>
                {steps[0][1]}
              </h2>
              <fieldset aria-labelledby="step-look">
                <div className="editor-pills" role="group" aria-label="Show looks">
                  {(["All", "Calm", "Retro", "Bold"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={mood === m}
                      onClick={() => setMood(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="editor-themes">
                  {themeIds.map((id) => (
                    <label
                      key={id}
                      className="editor-card"
                      hidden={mood !== "All" && !(moods[mood] as readonly ThemeId[]).includes(id)}
                    >
                      <ThemeShot id={id} />
                      <span className="editor-card-name">
                        <input
                          type="radio"
                          id={`theme-${id}`}
                          name="theme"
                          value={id}
                          checked={settings.theme === id}
                          onChange={() => update({ theme: id })}
                        />
                        {themes[id].name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <h2 id="step-details" className="editor-step" tabIndex={-1}>
                {steps[1][1]}
              </h2>
              <fieldset id="part-scenes" className="editor-part" tabIndex={-1}>
                <legend>Scene to edit</legend>
                <div className="editor-scenes editor-segmented">
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
                {resetButton(`${overlays[scene].name} text`, !same(current, fresh[scene]), () =>
                  updateScene(scene, fresh[scene]),
                )}
                <label>
                  Title
                  <input
                    value={current.title}
                    maxLength={60}
                    aria-describedby="chars-title"
                    onChange={(e) => updateScene(scene, { title: e.target.value })}
                  />
                </label>
                <CharsLeft id="chars-title" value={current.title} max={60} />
                <label>
                  Subtitle
                  <input
                    value={current.subtitle}
                    maxLength={120}
                    aria-describedby="chars-subtitle"
                    onChange={(e) => updateScene(scene, { subtitle: e.target.value })}
                  />
                </label>
                <CharsLeft id="chars-subtitle" value={current.subtitle} max={120} />
                {scene === "starting" && (
                  <>
                    {/* The kind of countdown comes first because it decides which time fields follow. Asking
                        "repeat this countdown?" before any countdown was set read backwards (T6.50). */}
                    {/* Three choices, all shown (T6.118): a drop-down hid two of them. */}
                    <fieldset className="editor-segmented" aria-describedby="repeat-hint">
                      <legend>Countdown</legend>
                      {repeatModes.map(([mode, label]) => (
                        <label key={mode}>
                          <input
                            type="radio"
                            name="repeat-mode"
                            value={mode}
                            checked={starting.repeat.mode === mode}
                            onChange={() =>
                              updateScene("starting", { repeat: { ...starting.repeat, mode } })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <p id="repeat-hint" className="editor-hint">
                      &quot;Every day&quot; and &quot;On set days&quot; always count to your next
                      stream, so you never re-paste the link into OBS.
                    </p>
                    {starting.repeat.mode === "off" ? (
                      <>
                        <label>
                          Countdown ends at (leave empty for no countdown)
                          <input
                            type="datetime-local"
                            value={
                              starting.endsAt === null
                                ? ""
                                : toZoneInput(starting.endsAt, starting.tz)
                            }
                            onChange={(e) =>
                              updateScene("starting", {
                                endsAt: fromZoneInput(e.target.value, starting.tz),
                              })
                            }
                          />
                        </label>
                        {/* Going live soon is the common case, and a date-time field is fiddly (T6.113). Whole
                            minutes, so the field shows exactly what was picked. */}
                        <div className="editor-quick" role="group" aria-label="Quick countdown">
                          {quickStarts.map(([label, minutes]) => (
                            <button
                              key={minutes}
                              type="button"
                              onClick={() =>
                                updateScene("starting", {
                                  endsAt:
                                    Math.ceil((Date.now() + minutes * 60_000) / 60_000) * 60_000,
                                })
                              }
                            >
                              {label}
                            </button>
                          ))}
                          {starting.endsAt !== null && (
                            <>
                              {/* A minute either way, like the kits' countdown controls (T6.118). */}
                              {(
                                [
                                  ["−1 min", "1 minute earlier", -1],
                                  ["+1 min", "1 minute later", 1],
                                ] as const
                              ).map(([label, name, step]) => (
                                <button
                                  key={step}
                                  type="button"
                                  aria-label={`Countdown ${name}`}
                                  onClick={() =>
                                    updateScene("starting", {
                                      endsAt: (starting.endsAt ?? 0) + step * 60_000,
                                    })
                                  }
                                >
                                  {label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => updateScene("starting", { endsAt: null })}
                              >
                                No countdown
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {starting.repeat.mode === "days" && (
                          <fieldset className="editor-days">
                            <legend>Stream days</legend>
                            {weekdays.map(([day, name]) => (
                              <label key={day} className="editor-check">
                                <input
                                  type="checkbox"
                                  checked={starting.repeat.days.includes(day)}
                                  onChange={(e) =>
                                    updateScene("starting", {
                                      repeat: {
                                        ...starting.repeat,
                                        days: e.target.checked
                                          ? [...starting.repeat.days, day].sort()
                                          : starting.repeat.days.filter((d) => d !== day),
                                      },
                                    })
                                  }
                                />
                                {name}
                              </label>
                            ))}
                          </fieldset>
                        )}
                        <label>
                          Stream starts at
                          <input
                            type="time"
                            value={starting.repeat.time}
                            onChange={(e) =>
                              // Clearing the field would make an invalid time, so keep the last good one.
                              e.target.value &&
                              updateScene("starting", {
                                repeat: { ...starting.repeat, time: e.target.value },
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                    <p className="editor-tz">
                      Your time zone: {zoneName(starting.tz)} ({starting.tz})
                      {!tzOpen && (
                        <button
                          type="button"
                          aria-label="Change time zone"
                          onClick={() => {
                            setTzOpen(true);
                            focusSoon("tz-select");
                          }}
                        >
                          Change
                        </button>
                      )}
                    </p>
                    {/* Stays open once shown: a closed select changes on every arrow key, so closing on change would trap keyboard users. */}
                    {tzOpen && (
                      <label>
                        Your time zone
                        <select
                          id="tz-select"
                          value={starting.tz}
                          onChange={(e) => {
                            // Keep the clock time the streamer typed; only its zone changes.
                            const typed =
                              starting.endsAt === null
                                ? ""
                                : toZoneInput(starting.endsAt, starting.tz);
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
                    )}
                    <label>
                      Message when the countdown ends
                      <input
                        value={starting.doneText}
                        maxLength={60}
                        aria-describedby="chars-done"
                        onChange={(e) => updateScene("starting", { doneText: e.target.value })}
                      />
                    </label>
                    <CharsLeft id="chars-done" value={starting.doneText} max={60} />
                  </>
                )}
              </fieldset>

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
                    onChange={(e) =>
                      update({ ticker: { ...settings.ticker, show: e.target.checked } })
                    }
                  />
                  Scrolling ticker along the bottom of every scene
                </label>
                <p id="ticker-hint" className="editor-hint">
                  Your socials scroll past, then an extra line if you add one: your schedule, a
                  Discord invite or a catchphrase.
                </p>
                {settings.ticker.show && (
                  <>
                    <label>
                      Ticker tab (optional)
                      <input
                        value={settings.ticker.label}
                        maxLength={24}
                        onChange={(e) =>
                          update({ ticker: { ...settings.ticker, label: e.target.value } })
                        }
                      />
                    </label>
                    <label>
                      Extra line (optional)
                      <input
                        value={settings.ticker.extra}
                        maxLength={120}
                        onChange={(e) =>
                          update({ ticker: { ...settings.ticker, extra: e.target.value } })
                        }
                      />
                    </label>
                  </>
                )}
              </fieldset>

              <fieldset id="part-chat" className="editor-part" tabIndex={-1}>
                <legend>Chat</legend>
                {resetButton(
                  "Chat settings",
                  !same({ ...settings.chat, channel: "" }, { ...fresh.chat, channel: "" }),
                  () => {
                    setSettings((st) => ({
                      ...st,
                      chat: { ...fresh.chat, channel: st.chat.channel },
                    }));
                    setBotsInput(fresh.chat.bots.join("\n"));
                  },
                )}
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
                  The name in your channel link, e.g. twitch.tv/<strong>yourname</strong>. You can
                  paste the whole link.
                </p>
                <label className="editor-check">
                  <input
                    type="checkbox"
                    checked={settings.chat.hideCommands}
                    onChange={(e) => updateChat({ hideCommands: e.target.checked })}
                  />
                  Hide chat commands (messages starting with !)
                </label>
                {/* Rarely changed, so tucked away (T6.20). */}
                <details className="editor-more">
                  <summary>More chat options</summary>
                  <label className="editor-check">
                    <input
                      type="checkbox"
                      checked={settings.chat.showBadges}
                      onChange={(e) => updateChat({ showBadges: e.target.checked })}
                    />
                    Show badges (Mod, Sub, VIP) before names
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
                    Messages from these accounts won’t show in your chat. Remove a name to show that
                    bot.
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
                </details>
              </fieldset>

              <fieldset id="part-alerts" className="editor-part" tabIndex={-1}>
                <legend>Alerts</legend>
                {resetButton("Alerts", !same(settings.alerts, fresh.alerts), () =>
                  update({ alerts: fresh.alerts }),
                )}
                <p className="editor-hint">
                  Alerts use your channel name from Chat. Chat and alerts work with Twitch only;
                  YouTube isn’t supported yet.
                </p>
                <label className="editor-slider">
                  Alert volume
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
                  <output aria-hidden>{settings.alerts.volume}%</output>
                </label>
                <p id="volume-hint" className="editor-hint">
                  0% turns the sound off. In OBS, tick “Control audio via OBS” on the Alerts source
                  so your viewers hear it.
                </p>
                <label>
                  Show each alert for
                  <select
                    value={settings.alerts.seconds}
                    aria-describedby="alert-place-hint"
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        alerts: { ...s.alerts, seconds: Number(e.target.value) },
                      }))
                    }
                  >
                    {[3, 5, 8, 10, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} seconds
                      </option>
                    ))}
                  </select>
                </label>
                {/* Streamers looked for position and size settings; those belong to the OBS source (T6.75). */}
                <p id="alert-place-hint" className="editor-hint">
                  To change where alerts appear or how big they are, move and resize the Alerts
                  source in OBS.
                </p>
                <details className="editor-more">
                  <summary>Change alert messages</summary>
                  <p id="alerts-hint" className="editor-hint">
                    Type your message, and use the buttons to add their name or the amount. The
                    example under each one shows how it will read.
                  </p>
                  {alertFields.map(([kind, label]) => (
                    <div key={kind} className="editor-template">
                      <label>
                        {label}
                        <input
                          id={`template-${kind}`}
                          value={settings.alerts.templates[kind]}
                          maxLength={100}
                          placeholder={defaultTemplates[kind]}
                          aria-describedby={`alerts-hint template-${kind}-example chars-template-${kind}`}
                          onChange={(e) => updateTemplate(kind, e.target.value)}
                        />
                      </label>
                      <div className="editor-template-tools">
                        <button
                          type="button"
                          aria-label={`Add their name to ${label}`}
                          onClick={() => insertInTemplate(kind, "{user}")}
                        >
                          + Their name
                        </button>
                        {kind !== "sub" && (
                          <button
                            type="button"
                            aria-label={`Add the amount to ${label}`}
                            onClick={() => insertInTemplate(kind, "{amount}")}
                          >
                            + Amount
                          </button>
                        )}
                      </div>
                      <p id={`template-${kind}-example`} className="editor-hint">
                        Example: {exampleAlert(settings.alerts.templates, kind)}
                      </p>
                      <CharsLeft
                        id={`chars-template-${kind}`}
                        value={settings.alerts.templates[kind]}
                        max={100}
                      />
                    </div>
                  ))}
                  <p className="editor-hint">
                    {"{user}"} and {"{amount}"} in a message are where the name and amount go.
                    {" {s}"} adds an “s” when the amount isn’t 1.
                  </p>
                </details>
              </fieldset>

              <fieldset id="part-frame" className="editor-part" tabIndex={-1}>
                <legend>Webcam frame</legend>
                {resetButton("Webcam frame", !same(settings.frame, fresh.frame), () =>
                  update({ frame: fresh.frame }),
                )}
                <p className="editor-hint">
                  A border in your look to put around your camera. In OBS, add its link as its own
                  Browser source above your camera, and line the two up.
                </p>
                <div className="editor-size">
                  <NumberField
                    label="Frame width"
                    value={settings.frame.width}
                    min={160}
                    max={1920}
                    describedBy="frame-size-hint"
                    onChange={(width) => updateFrame({ width })}
                  />
                  <NumberField
                    label="Frame height"
                    value={settings.frame.height}
                    min={120}
                    max={1080}
                    describedBy="frame-size-hint"
                    onChange={(height) => updateFrame({ height })}
                  />
                </div>
                <div className="editor-quick" role="group" aria-label="Common camera sizes">
                  {frameSizes.map(([w, h]) => (
                    <button
                      key={`${w}x${h}`}
                      type="button"
                      aria-pressed={settings.frame.width === w && settings.frame.height === h}
                      onClick={() => updateFrame({ width: w, height: h })}
                    >
                      {w} × {h}
                    </button>
                  ))}
                </div>
                <p id="frame-size-hint" className="editor-hint">
                  Make it the size of your camera in OBS. The numbers to enter in OBS are shown next
                  to the Webcam frame link.
                </p>
                {/* Placed here, the frame link is full screen and lines up by itself (T6.122). */}
                <fieldset className="editor-segmented" aria-describedby="frame-place-hint">
                  <legend>Where it goes</legend>
                  {(
                    [
                      ["obs", "I'll move it in OBS"],
                      ["here", "Place it here"],
                    ] as const
                  ).map(([where, label]) => (
                    <label key={where}>
                      <input
                        type="radio"
                        name="frame-place"
                        checked={(settings.frame.x !== null) === (where === "here")}
                        onChange={() =>
                          updateFrame(
                            where === "here"
                              ? { x: 48, y: 1080 - settings.frame.height - 48 }
                              : { x: null, y: null },
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <p id="frame-place-hint" className="editor-hint">
                  {settings.frame.x !== null
                    ? "Add the link in OBS full screen, 1920 × 1080, above your camera. Then line your camera up with the frame."
                    : "Add the link in OBS at the frame's size, then drag it over your camera."}
                </p>
                {settings.frame.x !== null && (
                  <FramePlacer frame={settings.frame} onMove={(at) => updateFrame(at)} />
                )}
                <label>
                  Name on the frame (optional)
                  <input
                    value={settings.frame.label}
                    maxLength={40}
                    onChange={(e) => updateFrame({ label: e.target.value })}
                  />
                </label>
                <div className="editor-frame-preview">
                  <Preview width={settings.frame.width} height={settings.frame.height}>
                    <Frame settings={settings} />
                  </Preview>
                </div>
              </fieldset>

              <ChannelPage settings={settings} />

              <fieldset id="part-logo" className="editor-part" tabIndex={-1}>
                <legend>Logo (optional)</legend>
                {resetButton("Logo", settings.logo !== "" || logoInput !== "", () => {
                  update({ logo: "" });
                  setLogoInput("");
                })}
                <label>
                  Link to your logo image (starts with https://)
                  <input
                    type="url"
                    value={logoInput}
                    maxLength={2048}
                    aria-invalid={!logoOk || logoBroken}
                    aria-describedby="logo-hint logo-error"
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setLogoInput(v);
                      setLogoBroken(false);
                      update({ logo: v === "" || isHttpsUrl(v) ? v : "" });
                    }}
                  />
                </label>
                <p id="logo-hint" className="editor-hint">
                  Use a picture that’s already online, like your Twitch profile picture: right-click
                  it, choose <strong>Copy image address</strong>, and paste it here.
                </p>
                {/* Streamers didn't know how to get an image link; uploads are out of scope for v1 (T6.73). */}
                <details className="editor-more">
                  <summary>How to get a link to your logo</summary>
                  <ol className="editor-steps-list">
                    <li>
                      Open your channel page on twitch.tv (or your YouTube or X profile) in your
                      browser.
                    </li>
                    <li>
                      Right-click your profile picture and choose{" "}
                      <strong>Copy image address</strong> (in Firefox:{" "}
                      <strong>Copy Image Link</strong>; on a Mac, Control-click).
                    </li>
                    <li>
                      Paste it in the box above. It starts with <code>https://</code>, and your logo
                      shows under the box when it works.
                    </li>
                  </ol>
                  <p className="editor-hint">
                    Any picture already online works the same way. Paste a link that opens just the
                    picture, not a page with the picture on it: share links from Google Drive or
                    Dropbox don’t work, and image links copied from Discord stop working after a
                    day.
                  </p>
                </details>
                {settings.logo && !logoBroken && (
                  <img
                    key={settings.logo}
                    className="editor-logo-check"
                    src={settings.logo}
                    alt="Your logo"
                    onError={() => setLogoBroken(true)}
                  />
                )}
                <p id="logo-error" className="editor-error" role="alert">
                  {!logoOk
                    ? "This link must start with https://. Copy the image address again and paste it."
                    : logoBroken
                      ? "No picture loaded from this link. Check that it opens an image in your browser, not a web page."
                      : ""}
                </p>
              </fieldset>

              {/* OBS doesn't always pass on the computer's reduced-motion setting, so it's a choice here (T6.74). */}
              <fieldset id="part-motion" className="editor-part" tabIndex={-1}>
                <legend>Motion</legend>
                {resetButton("Motion", motion !== "full", () =>
                  update({ lessMotion: false, liteMotion: false }),
                )}
                {/* Three steps, after the ICARUS kit's graphics load (T6.119). */}
                <div
                  className="editor-scenes editor-segmented"
                  role="radiogroup"
                  aria-label="How much moves"
                  aria-describedby="motion-hint"
                >
                  {motionLevels.map(([level, label]) => (
                    <label key={level}>
                      <input
                        type="radio"
                        name="motion"
                        value={level}
                        checked={motion === level}
                        onChange={() =>
                          update({ lessMotion: level === "still", liteMotion: level === "lite" })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p id="motion-hint" className="editor-hint">
                  {motionHints[motion]} The preview here follows it too.
                </p>
              </fieldset>

              <details id="part-colors" className="editor-advanced editor-part" tabIndex={-1}>
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
                      <code className="editor-hex">{asHex(look[token]).toUpperCase()}</code>
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

            <div
              className={`editor-side${settings.lessMotion ? " editor-shot" : motion === "lite" ? " editor-lite" : ""}`}
            >
              {/* In narrow windows this docks to the bottom behind a "Show preview" bar (editor.css). */}
              <section
                className="editor-preview-wrap editor-scene-preview"
                aria-label="Preview"
                data-open={previewOpen || undefined}
              >
                <button
                  type="button"
                  className="editor-preview-toggle"
                  aria-expanded={previewOpen}
                  aria-controls="scene-preview-body"
                  onClick={() => setPreviewOpen((o) => !o)}
                >
                  {previewOpen ? "Hide preview" : "Show preview"}
                </button>
                <div id="scene-preview-body" className="editor-scene-preview-body">
                  <h2>Preview: {overlays[scene].name}</h2>
                  <Preview>
                    {scene === "starting" ? (
                      <StartingSoon settings={settings} />
                    ) : (
                      <TextScene scene={scene} settings={settings} />
                    )}
                  </Preview>
                </div>
              </section>
              <section
                className="editor-preview-wrap editor-chat-preview"
                aria-label="Chat preview"
              >
                <h2>Preview: Chat (sample messages)</h2>
                <Preview width={settings.chat.width} height={settings.chat.height}>
                  <ChatView
                    settings={{ ...settings, chat: { ...settings.chat, fadeAfter: 0 } }}
                    messages={chatSamples}
                  />
                </Preview>
              </section>
              <AlertTester settings={settings} />
            </div>
            <ObsLinks settings={settings} heading={steps[2][1]} />
          </div>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
