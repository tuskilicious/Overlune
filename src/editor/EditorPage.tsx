import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router";
import { localZone } from "../lib/time";
import StartingSoon from "../overlays/starting/StartingSoon";
import TextScene from "../overlays/TextScene";
import { defaultSettings, type Settings } from "../settings/schema";
import { loadSaved, save } from "../settings/storage";
import { decodeLink, encode } from "../settings/url";
import { themes } from "../themes";
import { brandChrome } from "./brand";
import { themeIds, type ThemeId } from "../themes/types";
import { themeVars } from "../themes/vars";
import ChatView from "../overlays/chat/ChatView";
import { chatSamples } from "./chat-samples";
import AlertTester, { useTestAlerts } from "./AlertTester";
import AlertView from "../overlays/alerts/AlertView";
import { testAlerts } from "../alerts/events";
import ChannelPage from "./ChannelPage";
import ObsLinks, { overlays, type OverlayId as Scene } from "./ObsLinks";
import Preview from "./Preview";
import { sampleScene } from "./scene-samples";
import SiteFooter from "../components/SiteFooter";
import "./editor.css";
import Icon from "../components/Icon";
import { focusSoon, type SectionProps } from "./sections/fields";
import SceneText from "./sections/SceneText";
import Socials from "./sections/Socials";
import Chat from "./sections/Chat";
import Alerts from "./sections/Alerts";
import WebcamFrame from "./sections/WebcamFrame";
import Logo from "./sections/Logo";
import Colors from "./sections/Colors";

const browserTz = localZone();

/** Smooth scrolling shows where things go (T6.103); reduced motion jumps straight there. */
const scrollBehavior = (): ScrollBehavior =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || "rm" in document.documentElement.dataset
    ? "auto"
    : "smooth";

/** Scrolls to a section and moves focus there. No real #fragment jump: the address bar's fragment holds the settings. */
const jumpTo = (e: MouseEvent, id: string) => {
  e.preventDefault();
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: scrollBehavior() });
  target?.focus({ preventScroll: true });
};

/** Which ends of the looks filmstrip have more looks past them, for its faded edges and Previous/Next. */
const moreIn = (el: HTMLElement) =>
  [el.scrollLeft > 1 && "start", el.scrollLeft + el.clientWidth < el.scrollWidth - 1 && "end"]
    .filter(Boolean)
    .join(" ");

/** One card and its gap: 150px + 12px (editor.css). */
const stripStep = 162;

/** The editor's three steps (T6.18), in the steps bar and as section headings. */
const steps = [
  ["step-look", "1. Pick a look"],
  ["step-details", "2. Add your details"],
  ["obs-links", "3. Links to paste into OBS"],
] as const;

/** A step's heading. Wide windows drop the number (editor.css): step 1 is the filmstrip there, not a heading in the
 *  form (T6.135). */
const stepHeading = (name: string) => {
  const [num, ...rest] = name.split(" ");
  return (
    <>
      <span className="editor-step-num">{num} </span>
      {rest.join(" ")}
    </>
  );
};

/** Wide windows (T6.60): the section list on the left. Each jumps to its place in the settings column. */
const sections = [
  ["step-look", "Look", "look"],
  ["part-scenes", "Text", "text"],
  ["part-socials", "Socials", "socials"],
  ["part-chat", "Chat", "chat"],
  ["part-alerts", "Alerts", "alerts"],
  ["part-frame", "Webcam frame", "frame"],
  ["part-channel", "Channel page", "channel"],
  ["part-logo", "Logo", "logo"],
  ["part-motion", "Motion", "motion"],
  ["part-colors", "Colors", "colors"],
  ["obs-links", "Links", "links"],
] as const;

/** The section list folded to icons (T6.135) is a per-browser convenience, kept outside the link. Storage can be
 *  blocked (private windows), so every call is wrapped. */
const railKey = "overlune:rail-collapsed";
const readRail = () => {
  try {
    return localStorage.getItem(railKey) === "1";
  } catch {
    return false;
  }
};

/** The order Test alert plays the samples in (T6.135). */
const alertOrder = testAlerts.map((a) => a.kind);

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

/** Click-to-select (T6.135, the Studio board): the scene preview's parts, their names and the section each jumps to. */
const pickParts = [
  [".scene-logo", "Logo", "part-logo"],
  [".scene-title", "Title", "part-scenes"],
  [".scene-subtitle", "Subtitle", "part-scenes"],
  [".countdown", "Countdown", "part-scenes"],
  [".scene-socials", "Socials", "part-socials"],
  [".scene-ticker", "Ticker", "part-socials"],
  [".alert-box", "Alert", "part-alerts"],
] as const;

type Picked = {
  name: string;
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/** The smallest part under the pointer, placed relative to the preview. */
const partAt = (wrap: HTMLElement, x: number, y: number): Picked | null => {
  const box = wrap.getBoundingClientRect();
  let best: Picked | null = null;
  for (const [selector, name, id] of pickParts)
    for (const el of wrap.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      if (inside && (!best || r.width * r.height < best.width * best.height))
        best = {
          name,
          id,
          left: r.left - box.left,
          top: r.top - box.top,
          width: r.width,
          height: r.height,
        };
    }
  return best;
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

/** Wide windows show the filmstrip, narrower ones the grid (editor.css, 1200px). */
const wide = () => matchMedia("(min-width: 1200px)").matches;
/** The id of a look's radio in the picker on screen. */
const lookRadio = (id: ThemeId) => `${wide() ? "strip" : "theme"}-${id}`;

/** The look picker (T6.135): the filmstrip under the preview on wide windows, a card grid as step 1 in the form on
 *  narrower ones. Both are always rendered and editor.css hides one with display: none, so screen readers and Tab
 *  only ever meet one. The filter state is shared. */
function LookPicker({
  variant,
  theme,
  pick,
  mood,
  setMood,
}: {
  variant: "strip" | "grid";
  theme: ThemeId;
  pick: (id: ThemeId) => void;
  mood: Mood;
  setMood: (m: Mood) => void;
}) {
  const strip = variant === "strip";
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState("");
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setMore(moreIn(el));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mood]);
  const pills = (
    <div className="editor-pills" role="group" aria-label="Show looks">
      {(["All", "Calm", "Retro", "Bold"] as const).map((m) => (
        <button key={m} type="button" aria-pressed={mood === m} onClick={() => setMood(m)}>
          {m}
        </button>
      ))}
    </div>
  );
  const looks = themeIds.map((id) => {
    const radio = (
      <input
        type="radio"
        id={`${strip ? "strip" : "theme"}-${id}`}
        name={strip ? "strip-look" : "theme"}
        value={id}
        checked={theme === id}
        onChange={() => pick(id)}
      />
    );
    return (
      <label
        key={id}
        className={strip ? "editor-strip-look" : "editor-card"}
        hidden={mood !== "All" && !(moods[mood] as readonly ThemeId[]).includes(id)}
      >
        {strip && radio}
        <ThemeShot id={id} />
        {strip ? (
          <span>{themes[id].name}</span>
        ) : (
          <span className="editor-card-name">
            {radio}
            {themes[id].name}
          </span>
        )}
      </label>
    );
  });
  if (!strip)
    return (
      <fieldset aria-labelledby="step-look">
        {pills}
        <div className="editor-themes">{looks}</div>
      </fieldset>
    );
  // The filmstrip (the Studio board): real Starting Soon scenes, held still, as one radio group (one tab stop, arrow
  // keys move).
  return (
    <section className="editor-strip" aria-labelledby="strip-heading">
      <div className="editor-strip-bar">
        <h2 id="strip-heading">Looks</h2>
        {pills}
        <p className="editor-hint">Pick one and every scene restyles.</p>
        <div className="editor-strip-nav">
          {(
            [
              ["Previous looks", "back", "start", -1],
              ["Next looks", "next", "end", 1],
            ] as const
          ).map(([label, icon, side, dir]) => (
            <button
              key={side}
              type="button"
              aria-label={label}
              aria-controls="strip-scroller"
              aria-disabled={!more.includes(side) || undefined}
              onClick={() =>
                scroller.current?.scrollBy({ left: dir * stripStep, behavior: scrollBehavior() })
              }
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
      </div>
      {/* Focusable so the arrow keys scroll it, with the bar hidden (axe: scrollable-region-focusable). */}
      <div
        id="strip-scroller"
        ref={scroller}
        className="editor-strip-scroller"
        role="region"
        aria-label="Looks, scrolls sideways"
        tabIndex={0}
        data-more={more || undefined}
        onScroll={(e) => setMore(moreIn(e.currentTarget))}
      >
        <div className="editor-strip-track" role="radiogroup" aria-labelledby="strip-heading">
          {looks}
        </div>
      </div>
    </section>
  );
}

/** Where the editor starts: a link in the address wins, then this browser's autosave, then defaults. */
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
  const [loadOpen, setLoadOpen] = useState(false);
  // Kept apart from settings so a half-typed or unsafe link never reaches the preview.
  const [logoInput, setLogoInput] = useState(settings.logo);
  const [botsInput, setBotsInput] = useState(settings.chat.bots.join("\n"));
  const [loadText, setLoadText] = useState("");
  const [loadStatus, setLoadStatus] = useState(initial.status);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mood, setMood] = useState<Mood>("All");
  const [railCollapsed, setRailCollapsed] = useState(readRail);
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

  /** Undo (T6.115) and Redo (T6.135): earlier and undone settings, newest last. A burst of edits (typing a title) is
   *  one step; any new edit clears Redo, as in every editor. */
  const [past, setPast] = useState<Settings[]>([]);
  const [future, setFuture] = useState<Settings[]>([]);
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
    setFuture([]);
    lastEdit.current = now;
  }, [settings]);
  /** Shows a snapshot from Undo or Redo, with the boxes that keep their own text. */
  const restore = (to: Settings) => {
    undoing.current = true;
    lastEdit.current = 0; // the next edit is its own step
    setSettings(to);
    setLogoInput(to.logo);
    setBotsInput(to.chat.bots.join("\n"));
  };
  const undo = useCallback(() => {
    const before = past.at(-1);
    if (!before) return;
    setPast(past.slice(0, -1));
    setFuture((f) => [...f, settings]);
    restore(before);
    setLoadStatus("Undone.");
  }, [past, settings]);
  const redo = useCallback(() => {
    const next = future.at(-1);
    if (!next) return;
    setFuture(future.slice(0, -1));
    setPast((p) => [...p.slice(-49), settings]);
    restore(next);
    setLoadStatus("Redone.");
  }, [future, settings]);
  // Ctrl+Z / Cmd+Z undoes, and Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y redoes, outside text fields; inside one, the
  // browser's own undo and redo work on the text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const isRedo = (key === "z" && e.shiftKey) || (key === "y" && !e.shiftKey);
      const isUndo = key === "z" && !e.shiftKey;
      if (!isRedo && !isUndo) return;
      const t = e.target;
      const typing =
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable) ||
        (t instanceof HTMLInputElement &&
          !["checkbox", "radio", "range", "color", "button", "submit"].includes(t.type));
      if (typing || (isUndo ? !past.length : !future.length)) return;
      e.preventDefault();
      if (isUndo) undo();
      else redo();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [undo, redo, past.length, future.length]);

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

  /** Anything changed from a fresh editor, including work restored from a link or autosave. */
  const madeSomething = JSON.stringify(settings) !== freshJson;
  const motion = settings.lessMotion ? "still" : settings.liteMotion ? "lite" : "full";
  /** A section's Reset (T6.120), after the kits' docks: shown only when the section differs from the defaults.
   *  Undo brings it back, so there's no confirm step. */
  const fresh = freshSettings();
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
  const section: SectionProps = { settings, setSettings, update, fresh, resetButton };
  /** Test alert by the scene preview (T6.135): each press plays the next sample, through the same queue as the ?test=1
   *  link and the alert preview's buttons. */
  const { alert: testAlert, play: playAlert } = useTestAlerts(settings);
  const nextAlert = useRef(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const picker = {
    theme: settings.theme,
    pick: (id: ThemeId) => update({ theme: id }),
    mood,
    setMood,
  };

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
          {/* The address bar is rewritten on every change (above), so this is always true once something is made. */}
          {madeSomething && (
            <span className="editor-saved">
              <Icon name="check" />
              Saved in your link
            </span>
          )}
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
          {future.length > 0 && (
            <button type="button" onClick={redo} aria-keyshortcuts="Control+Shift+Z Control+Y">
              Redo
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
                      document.getElementById(lookRadio(id))?.focus({ preventScroll: true });
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
          <div className="editor-body" data-rail={railCollapsed ? "collapsed" : undefined}>
            {/* Wide windows only (editor.css); narrower ones use the steps bar above. */}
            <nav
              className="editor-rail"
              aria-label="Sections"
              data-collapsed={railCollapsed || undefined}
            >
              <ol id="editor-rail-list">
                {sections.map(([id, name, icon]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      title={railCollapsed ? name : undefined}
                      aria-current={currentSection === id ? "location" : undefined}
                      onClick={(e) => {
                        const colors = document.getElementById("part-colors");
                        if (id === "part-colors" && colors instanceof HTMLDetailsElement)
                          colors.open = true;
                        // Look: back to the top, where it's the current section, and onto the filmstrip's
                        // checked look (T6.135).
                        if (id !== "step-look") return jumpTo(e, id);
                        e.preventDefault();
                        scrollTo({ top: 0, behavior: scrollBehavior() });
                        focusSoon(lookRadio(settings.theme));
                      }}
                    >
                      <Icon name={icon} />
                      {/* Folded, the name stays for screen readers (and as a tooltip) but not on screen. */}
                      <span className="editor-rail-name">{name}</span>
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
              {/* Folds the list to icons, as on the Studio board (T6.135). */}
              <button
                type="button"
                className="editor-rail-toggle"
                aria-expanded={!railCollapsed}
                aria-controls="editor-rail-list"
                aria-label={railCollapsed ? "Expand menu" : undefined}
                title={railCollapsed ? "Expand menu" : undefined}
                onClick={() => {
                  const next = !railCollapsed;
                  setRailCollapsed(next);
                  try {
                    localStorage.setItem(railKey, next ? "1" : "0");
                  } catch {
                    // Remembering it is a convenience; the menu still folds.
                  }
                }}
              >
                <Icon name={railCollapsed ? "open" : "collapse"} />
                <span className="editor-rail-name">Collapse menu</span>
              </button>
            </nav>
            <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
              {/* Wide windows: the column starts with the look's name; Change look goes to the filmstrip (T6.135). */}
              <p className="editor-current-look">
                Look: <strong>{themes[settings.theme].name}</strong>
                <button type="button" onClick={() => focusSoon(lookRadio(settings.theme))}>
                  Change look
                </button>
              </p>
              {/* Narrower windows: the same picker as a card grid, as step 1 (editor.css shows exactly one). */}
              <div className="editor-look-step">
                <h2 id="step-look" className="editor-step" tabIndex={-1}>
                  {stepHeading(steps[0][1])}
                </h2>
                <LookPicker variant="grid" {...picker} />
              </div>

              <h2 id="step-details" className="editor-step" tabIndex={-1}>
                {stepHeading(steps[1][1])}
              </h2>
              <SceneText {...section} scene={scene} setScene={setScene} />
              <Socials {...section} />
              <Chat {...section} botsInput={botsInput} setBotsInput={setBotsInput} />
              <Alerts {...section} />
              <WebcamFrame {...section} />

              <ChannelPage settings={settings} />

              <Logo {...section} logoInput={logoInput} setLogoInput={setLogoInput} />

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

              <Colors {...section} />
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
                  {/* The preview's bar (T6.135, the Studio board): its name, the canvas size and Test alert, which
                      plays the next sample alert over the scene, as on stream. */}
                  <div className="editor-preview-bar">
                    <h2>Preview: {overlays[scene].name}</h2>
                    <span className="editor-chip-static">1920 × 1080</span>
                    <button
                      type="button"
                      className="editor-test-alert"
                      onClick={() => {
                        const kind = alertOrder[nextAlert.current % alertOrder.length]!;
                        nextAlert.current += 1;
                        playAlert(kind);
                      }}
                    >
                      Test alert
                    </button>
                  </div>
                  {/* Click a part to jump to its settings; hover outlines it and names it (T6.135, the Studio board).
                      A mouse shortcut only: the section list and the form already reach every setting by keyboard. */}
                  <div
                    className="editor-pick"
                    data-hover={picked ? "" : undefined}
                    onPointerMove={(e) => setPicked(partAt(e.currentTarget, e.clientX, e.clientY))}
                    onPointerLeave={() => setPicked(null)}
                    onClick={(e) => {
                      const part = partAt(e.currentTarget, e.clientX, e.clientY);
                      if (part) jumpTo(e, part.id);
                    }}
                  >
                    <Preview>
                      {scene === "starting" ? (
                        <StartingSoon settings={settings} />
                      ) : (
                        <TextScene scene={scene} settings={settings} />
                      )}
                      <AlertView settings={settings} alert={testAlert} />
                    </Preview>
                    {picked && (
                      <div
                        className="editor-pick-box"
                        data-below={picked.top < 28 || undefined}
                        style={{
                          left: picked.left,
                          top: picked.top,
                          width: picked.width,
                          height: picked.height,
                        }}
                        aria-hidden
                      >
                        <span>{picked.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
              {/* Wide windows: the look picker is the filmstrip under the preview (T6.135). */}
              <LookPicker variant="strip" {...picker} />
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
            <ObsLinks settings={settings} heading={stepHeading(steps[2][1])} />
          </div>
        </>
      )}
      <SiteFooter />
    </div>
  );
}
