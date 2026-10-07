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
import AlertTester from "./AlertTester";
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
