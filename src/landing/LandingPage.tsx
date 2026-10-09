import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { animate } from "../lib/motion";
import { testAlerts } from "../alerts/events";
import Icon from "../components/Icon";
import SiteFooter, { repoUrl, supportUrl } from "../components/SiteFooter";
import { chatSamples } from "../editor/chat-samples";
import Preview from "../editor/Preview";
import { sampleScene } from "../editor/scene-samples";
import { loadSaved } from "../settings/storage";
import AlertView from "../overlays/alerts/AlertView";
import ChatView from "../overlays/chat/ChatView";
import StartingSoon from "../overlays/starting/StartingSoon";
import TextScene from "../overlays/TextScene";
import Frame from "../overlays/frame/Frame";
import { themes } from "../themes";
import { themeIds, type ThemeId } from "../themes/types";
import "../editor/brand"; // brand fonts (Quicksand, Nunito)
import "./landing.css";

/** Previews still waiting, built one per idle moment after the page has loaded, so they're ready before anyone
 *  scrolls to them without blocking the load or a scroll (T6.78). */
const waiting: (() => void)[] = [];
let idleScheduled = false;
function buildWhenIdle() {
  if (idleScheduled || !waiting.length) return;
  idleScheduled = true;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200)); // Safari has none
  // The timeout: a page that's never idle (a weak CPU running the live scenes) still builds them, just later.
  idle(
    () => {
      idleScheduled = false;
      waiting.shift()?.();
      buildWhenIdle();
    },
    { timeout: 300 },
  );
}

/** A preview that's built later (T6.78): when the browser is idle after loading, or as soon as it comes near the
 *  screen, whichever is first. The page shows about 20 live previews; building them all at load blocked a weak CPU
 *  for 1 to 1.7 seconds. Until then, an empty box of the same shape holds its place, so the layout and the scroll
 *  animations don't jump. */
function LazyPreview({
  width = 1920,
  height = 1080,
  children,
  onBuilt,
}: {
  width?: number;
  height?: number;
  children: ReactNode;
  /** Called once the preview is built, for parents that measure what's inside. */
  onBuilt?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) onBuilt?.();
  }, [near, onBuilt]);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "100% 0px" }, // a screen ahead, so it's ready before it scrolls in
    );
    io.observe(el);
    const build = () => setNear(true);
    waiting.push(build);
    buildWhenIdle();
    return () => {
      io.disconnect();
      const i = waiting.indexOf(build);
      if (i >= 0) waiting.splice(i, 1);
    };
  }, [near]);
  if (near)
    return (
      <Preview width={width} height={height}>
        {children}
      </Preview>
    );
  return (
    <div
      ref={ref}
      className="editor-preview"
      aria-hidden
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}

/** A theme's real Starting Soon scene as a picture. `live` keeps its motion (the hero); the rest hold still. */
function Scene({ theme, live = false }: { theme: ThemeId; live?: boolean }) {
  return (
    <div className={live ? undefined : "landing-still"}>
      <LazyPreview>
        <StartingSoon settings={sampleScene(theme)} />
      </LazyPreview>
    </div>
  );
}

type KitScene = "starting" | "brb" | "ending" | "offline";

/** One alert card on its own, cropped to the card's height so long and short alerts both fit (T6.59). The card
 *  sits at its 1920x1080 canvas's top left (landing.css), and the crop follows it as the width or text changes. */
function AlertCard({ theme, alert }: { theme: ThemeId; alert: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  // The card only exists once its preview is built (T6.78), so measure from then on (T6.85).
  const [built, setBuilt] = useState(false);
  const onBuilt = useCallback(() => setBuilt(true), []);
  useLayoutEffect(() => {
    const box = ref.current!.querySelector(".alert-box");
    if (!box) return;
    const ro = new ResizeObserver(() => setHeight(box.getBoundingClientRect().height));
    ro.observe(box);
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, [theme, alert, built]);
  return (
    <div ref={ref} className="landing-alert overflow-hidden rounded-xl" style={{ height }}>
      <LazyPreview width={1000} height={400} onBuilt={onBuilt}>
        <AlertView settings={sampleScene(theme)} alert={testAlerts[alert]!} />
      </LazyPreview>
    </div>
  );
}

/** One scene of a look, live (TextScene for BRB, Stream Ending and Offline). */
function SceneOf({ theme, scene }: { theme: ThemeId; scene: KitScene }) {
  const settings = sampleScene(theme);
  return scene === "starting" ? (
    <StartingSoon settings={settings} />
  ) : (
    <TextScene scene={scene} settings={settings} />
  );
}

const sceneNames: Record<KitScene, string> = {
  starting: "Starting Soon",
  brb: "Be Right Back",
  ending: "Stream Ending",
  offline: "Offline",
};

/** The hero frame's tour: a look and a scene each, so it shows the whole kit over time (T6.59). */
const tour: [ThemeId, KitScene][] = [
  ["vaporwave-sunset", "starting"],
  ["cozy-cafe", "brb"],
  ["neon-grid", "ending"],
  ["pastel-cloud", "offline"],
  ["forest-night", "starting"],
  ["bold-esports", "brb"],
  ["arcade-8bit", "ending"],
  ["clean-slate", "offline"],
  ["daylight", "starting"],
  ["abyss", "brb"],
  ["session", "ending"],
  ["shonen", "offline"],
  ["sakura", "starting"],
  ["skate-deck", "brb"],
  ["phosphor", "ending"],
  ["quest", "offline"],
];

/** The hero picture: a live scene in a stream frame, two alerts in the same look, and the scene names. It tours
 *  the looks every few seconds; with reduced motion it starts paused on one look, and Pause stops it any time
 *  (WCAG 2.2.2), which also holds the scene's own motion still. */
function HeroKit() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(
    () => matchMedia("(prefers-reduced-motion: no-preference)").matches,
  );
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((n) => (n + 1) % tour.length), 4500);
    return () => clearInterval(id);
  }, [playing]);
  const [theme, scene] = tour[step]!;
  const still = playing ? "" : "landing-still";
  return (
    <figure className="relative mx-auto w-full max-w-3xl" data-kit={theme}>
      <div className="landing-glow-frame relative">
        <div key={step} className={still}>
          <Preview>
            <SceneOf theme={theme} scene={scene} />
          </Preview>
        </div>
        <span
          aria-hidden
          className="absolute top-3 right-3 rounded-full bg-cyan px-2.5 py-0.5 font-heading text-xs font-bold tracking-wider text-night"
        >
          LIVE
        </span>
      </div>
      {/* The alerts float over the frame's empty top-left sky on wide screens, and sit under it on phones. */}
      <div
        className={`landing-kit-alerts mt-4 grid grid-cols-2 items-start gap-3 lg:absolute lg:items-stretch lg:top-[-2.5rem] lg:left-[-3.5rem] lg:mt-0 lg:flex lg:w-[50%] lg:flex-col ${still}`}
      >
        {[1, 3].map((i) => (
          <AlertCard key={`${step}-${i}`} theme={theme} alert={i} />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ul aria-label="Scenes in every look" className="flex flex-wrap gap-2">
          {(Object.keys(sceneNames) as KitScene[]).map((id) => (
            <li
              key={id}
              aria-current={id === scene || undefined}
              className="rounded-full border border-white/15 px-3 py-1 text-sm text-haze aria-[current=true]:border-violet aria-[current=true]:bg-violet aria-[current=true]:text-night"
            >
              {sceneNames[id]}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="ml-auto cursor-pointer rounded-full border border-white/15 bg-transparent px-3 py-1 font-body text-sm text-haze hover:text-moon"
        >
          {playing ? "Pause the looks" : "Play the looks"}
        </button>
      </div>
      <figcaption className="sr-only">
        Live examples of Overlune scenes and alerts, showing {themes[theme].name}.
      </figcaption>
    </figure>
  );
}

/** The seven overlays, each a live thumbnail that opens its part of the editor (T6.59): the four scenes, then the
 *  three that sit over the game (T6.148). */
const elements: { part: string; name: string; line: string; theme: ThemeId }[] = [
  {
    part: "starting",
    name: "Starting Soon",
    line: "A countdown to your stream.",
    theme: "clean-slate",
  },
  {
    part: "brb",
    name: "Be Right Back",
    line: "For breaks, with your socials.",
    theme: "pastel-cloud",
  },
  {
    part: "ending",
    name: "Stream Ending",
    line: "Thanks, and where to find you.",
    theme: "neon-grid",
  },
  {
    part: "offline",
    name: "Offline",
    line: "For when you're not live.",
    theme: "daylight",
  },
  { part: "chat", name: "Chat", line: "Your Twitch chat in the same look.", theme: "cozy-cafe" },
  {
    part: "frame",
    name: "Webcam frame",
    line: "A border for your camera, if you use one.",
    theme: "vaporwave-sunset",
  },
  {
    part: "alerts",
    name: "Alerts",
    line: "Raids, subs, gift subs and bits.",
    theme: "bold-esports",
  },
];

function ElementShot({ part, theme }: { part: string; theme: ThemeId }) {
  if (part === "chat")
    return (
      <div className="mx-auto w-[36%]">
        <LazyPreview width={400} height={600}>
          <ChatView settings={sampleScene(theme)} messages={chatSamples} />
        </LazyPreview>
      </div>
    );
  if (part === "frame")
    return (
      // A plain stand-in for the camera behind it, so the clear middle reads as clear (T6.88).
      <div className="landing-camera mx-auto mt-[9%] w-[72%]">
        <LazyPreview width={640} height={360}>
          <Frame
            settings={{
              ...sampleScene(theme),
              frame: { ...sampleScene(theme).frame, label: "yourname" },
            }}
          />
        </LazyPreview>
      </div>
    );
  if (part === "alerts")
    return (
      <div className="mx-auto mt-[14%] w-[86%]">
        <AlertCard theme={theme} alert={0} />
      </div>
    );
  return (
    <LazyPreview>
      <SceneOf theme={theme} scene={part as KitScene} />
    </LazyPreview>
  );
}

/** A card's live thumbnail with a magnifier that follows the mouse (T6.148, after 21st.dev's "Magnified Bento";
 *  behavior only): a 2x copy of the overlay shows through a round lens, so small type and detail read. The copy is
 *  built only while the pointer is over this card, and touch screens skip it. */
function Magnified({ part, theme }: { part: string; theme: ThemeId }) {
  const [on, setOn] = useState(false);
  const aim = (ev: PointerEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty("--lx", `${ev.clientX - r.left}px`);
    ev.currentTarget.style.setProperty("--ly", `${ev.clientY - r.top}px`);
  };
  return (
    <div
      className="landing-still relative aspect-video overflow-hidden rounded-xl bg-night"
      onPointerEnter={(ev) => {
        if (ev.pointerType === "touch") return;
        aim(ev);
        setOn(true);
      }}
      onPointerMove={aim}
      onPointerLeave={() => setOn(false)}
    >
      <ElementShot part={part} theme={theme} />
      {on && (
        <>
          <div aria-hidden className="landing-lens">
            <div className="landing-lens-zoom">
              <ElementShot part={part} theme={theme} />
            </div>
          </div>
          <span aria-hidden className="landing-lens-ring" />
        </>
      )}
    </div>
  );
}

/** Which of the page's sections is in the middle of the window, for the nav (T6.59). */
function useSectionInView(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          setCurrent((c) => (e.isIntersecting ? e.target.id : c === e.target.id ? null : c));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ids]);
  return current;
}

const sections = ["kit", "looks", "how"];

/** The ruler's sections (T6.148): the name it shows next to its marker. */
const rulerSections: [id: string, name: string][] = [
  ["kit", "Overlays"],
  ["stage", "On stream"],
  ["looks", "Looks"],
  ["how", "How it works"],
  ["works", "Where it works"],
  ["know", "Good to know"],
  ["start", "Get started"],
];
const rulerIds = rulerSections.map(([id]) => id);
/** Wide windows with a mouse. Touch screens keep the browser's own scrollbar. */
const rulerQuery = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
/** One tick per 56px of page, a number every fifth. */
const TICK = 56;

/**
 * The page's scrollbar on wide windows (T6.148, after getartcraft.com's ruler; no code from it): a strip on the right
 * edge whose ticks are fixed to the page, so it scrolls past like a measuring tape, and a Signal Cyan marker that
 * moves down it with the share read and the section's name. Click or drag on it to move through the page. It
 * replaces the browser's scrollbar (html[data-ruler]); the keyboard and wheel scroll the page as always.
 */
function Ruler() {
  const [wide, setWide] = useState(() => matchMedia(rulerQuery).matches);
  useEffect(() => {
    const mq = matchMedia(rulerQuery);
    const change = () => setWide(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  return wide ? <RulerStrip /> : null;
}

function RulerStrip() {
  const tape = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const [height, setHeight] = useState(() => document.documentElement.scrollHeight);
  const current = useSectionInView(rulerIds);
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.ruler = "";
    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = html.scrollHeight - innerHeight;
      const share = max > 0 ? Math.min(1, scrollY / max) : 0;
      tape.current!.style.transform = `translateY(${-scrollY}px)`;
      mark.current!.style.transform = `translateY(${16 + share * (innerHeight - 32)}px)`;
      mark.current!.toggleAttribute("data-low", share < 0.5);
      setPct(Math.round(share * 100));
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    // The page grows as previews build and images load.
    const ro = new ResizeObserver(() => {
      setHeight(html.scrollHeight);
      later();
    });
    ro.observe(document.body);
    draw();
    addEventListener("scroll", later, { passive: true });
    addEventListener("resize", later);
    return () => {
      delete html.dataset.ruler;
      removeEventListener("scroll", later);
      removeEventListener("resize", later);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const seek = (ev: PointerEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    scrollTo({
      top: share * (document.documentElement.scrollHeight - innerHeight),
      behavior: "instant",
    });
  };
  return (
    <div
      role="scrollbar"
      aria-controls="main"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Page position"
      className="landing-ruler"
      onPointerDown={(ev) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        seek(ev);
      }}
      onPointerMove={(ev) => {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) seek(ev);
      }}
    >
      <div ref={tape} aria-hidden className="landing-ruler-tape" style={{ height }}>
        {Array.from({ length: Math.ceil(height / (TICK * 5)) }, (_, i) => (
          <span key={i} style={{ top: i * TICK * 5 }}>
            {i * 5}
          </span>
        ))}
      </div>
      <div ref={mark} aria-hidden className="landing-ruler-mark">
        <span className="landing-ruler-pct">{pct}%</span>
        <span className="landing-ruler-section">
          {rulerSections.find(([id]) => id === current)?.[1] ?? "Overlune"}
        </span>
      </div>
    </div>
  );
}

/** What works where, said plainly (T6.69): streamers couldn't tell which platforms are supported. */
const goodToKnow = [
  [
    "What you’ll need",
    "OBS Studio or Streamlabs Desktop. For chat and alerts, also your Twitch channel name.",
  ],
  [
    "Works in OBS and Streamlabs",
    "Each overlay is a Browser source in OBS Studio or Streamlabs Desktop, whatever platform you stream to.",
  ],
  [
    "Extras for your channel",
    "Twitch panels and an offline banner in your look, downloaded as pictures from the editor.",
  ],
  [
    "Your links never break",
    "Paste a link once. When a look gets an update, your overlays pick it up on their own.",
  ],
] as const;

type Support = "Yes" | "Not yet" | "No";

/** What works on which platform (T6.79), said as plainly as a table can. "Not yet" is only for what's planned
 *  (PRD v2: follow alerts, YouTube and Kick chat; YouTube alerts were saved for later with them). */
const platforms = ["Twitch", "YouTube", "Kick and others"] as const;
/** Grouped like 21st.dev's "Feature Comparison Table" (T6.152): what shows on screen, and what reads your chat. */
const support: {
  group: string;
  rows: { overlay: string; detail: string; on: [Support, Support, Support] }[];
}[] = [
  {
    group: "On screen",
    rows: [
      {
        overlay: "Scenes",
        detail: "Starting Soon, Be Right Back, Stream Ending, Offline",
        on: ["Yes", "Yes", "Yes"],
      },
      { overlay: "Webcam frame", detail: "A border for your camera", on: ["Yes", "Yes", "Yes"] },
    ],
  },
  {
    group: "From your chat",
    rows: [
      { overlay: "Chat", detail: "Your chat, in your look", on: ["Yes", "Not yet", "Not yet"] },
      {
        overlay: "Alerts",
        detail: "Raids, subs, gift subs and bits",
        on: ["Yes", "Not yet", "No"],
      },
      {
        overlay: "Follow alerts",
        detail: "Need a Twitch login",
        on: ["Not yet", "No", "No"],
      },
    ],
  },
];

/** A cell: a tick, a cross, or the words. Screen readers get the words every time. */
function SupportCell({ value }: { value: Support }) {
  if (value === "Not yet") return <>Not yet</>;
  return (
    <>
      <span aria-hidden data-mark={value} className="landing-mark">
        {value === "Yes" ? (
          <Icon name="check" />
        ) : (
          <svg viewBox="0 0 12 12">
            <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
          </svg>
        )}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

const facts = [
  `${themeIds.length} looks`,
  "Scenes, chat and alerts",
  "One link per overlay",
  "Free, no account",
];

const steps = [
  ["Pick a look", `${themeIds.length} looks, each with matching scenes, chat and alerts.`],
  ["Add your details", "Your title, countdown, socials and Twitch channel name."],
  [
    "Paste into OBS",
    "Copy each link into a Browser source, or import every scene at once in OBS Studio. The setup guide shows how.",
  ],
] as const;

const promise =
  "No account and no payment. Your settings live in your link and your browser, your chat is read anonymously, and the code is open source.";

const button =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-heading text-lg font-bold transition-colors duration-300";

/** The looks the stream stage can switch between (T6.124). */
const stageLooks: ThemeId[] = [
  "abyss",
  "session",
  "shonen",
  "neon-grid",
  "cozy-cafe",
  "vaporwave-sunset",
];

/** What the stage shows, said in words under it (T6.124). */
const stageNotes = [
  ["Chat in your colors", "Your Twitch chat, styled to match. Bots and commands stay out of it."],
  ["Alerts with sound", "Raids, subs, gift subs and bits, each with its look’s sound."],
  ["A frame for your camera", "Placed where your camera sits, in the same look."],
  [
    "Your link is your save file",
    "No account to make. Bookmark the editor and come back any time.",
  ],
] as const;

/**
 * The whole kit on a stream (T6.124): chat, an alert and the webcam frame over a game, in one look, switchable. The
 * game is a plain stand-in drawn in CSS, labeled as such, so the overlays are the only real thing in the picture.
 */
function StreamStage() {
  const [look, setLook] = useState<ThemeId>("abyss");
  const settings = sampleScene(look);
  // A new alert every 6.5 seconds (each shows for 5), so the stage stays alive. Reduced motion: one, held still.
  const [alert, setAlert] = useState(2);
  const [moving] = useState(() => matchMedia("(prefers-reduced-motion: no-preference)").matches);
  useEffect(() => {
    if (!moving) return;
    const id = setInterval(() => setAlert((n) => (n + 1) % testAlerts.length), 6500);
    return () => clearInterval(id);
  }, [moving]);
  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2
            id="stage-heading"
            data-reveal
            className="font-heading text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] font-bold"
          >
            Your whole stream, in one look.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-haze">
            Chat, alerts and your webcam frame sit over your game in the same colors and fonts as
            your scenes. Switch the look and they all change together.
          </p>
        </div>
        <div role="group" aria-label="Show it in" className="flex flex-wrap gap-2">
          {stageLooks.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={look === id}
              onClick={() => setLook(id)}
              className="cursor-pointer rounded-full border border-white/15 bg-transparent px-4 py-2 font-body text-sm text-haze hover:border-moon hover:text-moon aria-pressed:border-violet aria-pressed:bg-violet aria-pressed:text-night"
            >
              {themes[id].name}
            </button>
          ))}
        </div>
      </div>
      <div className="landing-stage mt-12">
        <div key={look} className="landing-stage-swap">
          <LazyPreview>
            <div className="landing-stage-canvas">
              <div aria-hidden className="landing-stage-game">
                <span>Your game</span>
              </div>
              <Frame
                settings={{
                  ...settings,
                  frame: { width: 560, height: 315, label: "yourname", x: 64, y: 701 },
                }}
              />
              <div className="landing-stage-chat">
                <ChatView
                  settings={{ ...settings, chat: { ...settings.chat, width: 420, height: 620 } }}
                  messages={chatSamples}
                />
              </div>
              <div className={`landing-stage-alert${moving ? "" : " landing-still"}`}>
                <AlertView key={alert} settings={settings} alert={testAlerts[alert]!} />
              </div>
            </div>
          </LazyPreview>
        </div>
      </div>
      <ul className="landing-stage-notes mt-12">
        {stageNotes.map(([title, text]) => (
          <li key={title}>
            <h3 className="font-heading text-xl font-bold">{title}</h3>
            <p className="mt-2 text-haze">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One line per look for the showcase (T6.124): what it is, in its own words. */
const blurbs: Record<ThemeId, string> = {
  "clean-slate": "Quiet and sharp, with one blue accent.",
  "neon-grid": "A glowing grid floor under a dark sky.",
  "cozy-cafe": "Warm paper, window light and rising steam.",
  "arcade-8bit": "Pixel type, scanlines and a blinking cursor.",
  "pastel-cloud": "Soft colors, drifting clouds and a sparkle.",
  "forest-night": "A full moon, fireflies and a pine treeline.",
  "bold-esports": "Condensed type and angled red slabs.",
  "vaporwave-sunset": "A striped sun setting behind the palms.",
  daylight: "A light look with a vermilion disc.",
  abyss: "Deep water where only living things glow.",
  session: "A jazz-anime title card in mustard and ink.",
  shonen: "A manga page, inked and lettered.",
  sakura: "A spring night with petals and a lantern.",
  "skate-deck": "A deck wall in aqua, pink and grip tape.",
  phosphor: "A green terminal glowing at midnight.",
  quest: "A quest log in gold, parchment and embers.",
};

/** A look full screen (T6.106): a native dialog keeps focus and Esc; its body goes full screen, since Chrome won't
 *  for a dialog itself. Phones that can't go full screen get a dialog that fills the window. */
function FullScreenLook({ look, onClose }: { look: ThemeId | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d || !look) return;
    d.showModal();
    let gone = false;
    screen.current?.requestFullscreen?.().then(
      () => gone && void document.exitFullscreen(), // closed before full screen arrived
      () => {},
    );
    // Esc in full screen only leaves full screen, so close with it.
    const left = () => {
      if (!document.fullscreenElement) d.close();
    };
    document.addEventListener("fullscreenchange", left);
    return () => {
      gone = true;
      document.removeEventListener("fullscreenchange", left);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [look]);
  // Leave full screen first (that closes the dialog, as Esc does), so focus returns to the look.
  const close = () =>
    document.fullscreenElement ? void document.exitFullscreen() : dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      className="landing-look-full"
      aria-label={look ? `${themes[look].name}, full screen` : undefined}
      onClose={onClose}
    >
      <div ref={screen} className="landing-look-full-body">
        {look && (
          <>
            <div className="landing-look-full-stage">
              <Preview>
                <StartingSoon settings={sampleScene(look)} />
              </Preview>
            </div>
            <button
              type="button"
              className={`${button} landing-look-full-close border border-moon/40 bg-night/80 text-moon hover:border-moon`}
              onClick={close}
            >
              Close (Esc)
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

/**
 * The looks (T6.124), after the owner's reference recording: a violet section rising on a curve, the looks listed on
 * the left and one big live preview on the right. On wide windows the preview follows the row in the middle of the
 * window as you scroll, or the one under the pointer or keyboard focus; on narrow ones each row shows its own picture.
 */
function LooksShowcase() {
  const [active, setActive] = useState<ThemeId>("abyss");
  const [scene, setScene] = useState<KitScene>("starting");
  const [open, setOpen] = useState<ThemeId | null>(null);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const wide = matchMedia("(min-width: 1024px)");
    const io = new IntersectionObserver(
      (entries) => {
        if (!wide.matches) return;
        for (const e of entries)
          if (e.isIntersecting) setActive(e.target.getAttribute("data-look-row") as ThemeId);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    for (const row of list.current!.querySelectorAll("[data-look-row]")) io.observe(row);
    return () => io.disconnect();
  }, []);
  return (
    <div className="mx-auto max-w-7xl">
      <div className="max-w-2xl">
        <h2
          id="looks-heading"
          data-reveal
          className="font-heading text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.02] font-bold"
        >
          {themeIds.length} looks. Every scene matches.
        </h2>
        <p className="mt-6 max-w-md text-lg text-moon/85">
          Pick one and all four scenes, from Starting Soon to Offline, plus chat and alerts, change
          together. Switch any time.
        </p>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
        <ol ref={list} className="landing-look-list" aria-label="The looks">
          {themeIds.map((id) => (
            <li key={id} data-look-row={id} aria-current={active === id || undefined}>
              <button
                type="button"
                className="landing-look-row"
                onPointerEnter={() => setActive(id)}
                onFocus={() => setActive(id)}
                onClick={() => setActive(id)}
              >
                <span className="font-heading text-2xl font-bold">{themes[id].name}</span>
                <span className="text-moon/75">{blurbs[id]}</span>
              </button>
              <button
                type="button"
                className="landing-look-expand"
                aria-label={`See ${themes[id].name} full screen`}
                onClick={() => setOpen(id)}
              >
                <Icon name="expand" />
              </button>
              {/* Narrow windows: each look shows its own picture, since a sticky preview needs room beside it. */}
              <div data-look className="landing-look-thumb">
                <Scene theme={id} />
              </div>
            </li>
          ))}
        </ol>
        <div className="landing-look-stage">
          <div key={`${active}-${scene}`} className="landing-look-preview">
            <Preview>
              <SceneOf theme={active} scene={scene} />
            </Preview>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(Object.keys(sceneNames) as KitScene[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={scene === id}
                onClick={() => setScene(id)}
                className="cursor-pointer rounded-full border border-moon/30 bg-transparent px-4 py-1.5 font-body text-sm text-moon hover:border-moon aria-pressed:border-moon aria-pressed:bg-moon aria-pressed:text-night"
              >
                {sceneNames[id]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(active)}
              className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-moon/30 bg-transparent px-4 py-1.5 font-body text-sm text-moon hover:border-moon"
            >
              <Icon name="expand" /> Full screen
            </button>
          </div>
          <Link to="/editor" className={`${button} mt-8 bg-moon text-night hover:bg-white`}>
            Use {themes[active].name}
          </Link>
        </div>
      </div>
      <FullScreenLook look={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** The hero's headline, revealed a word at a time (T6.129). */
const headline = "Free stream overlays that look pro.";

/**
 * The hero's night (T6.129, after the Kage reference): three ridges standing in front of the sky, the nearest with a
 * crest of pines, and motes rising past them. They rise in from the card's foot on load and part as you scroll.
 */
function HeroNight() {
  return (
    <div aria-hidden className="landing-night">
      <div className="landing-motes" />
      {/* One svg per ridge: animating an svg element is composited, a path inside one runs on the main thread. */}
      <div className="landing-ridges">
        <svg
          data-ridge
          className="landing-ridge-far"
          style={{ "--i": 0 } as CSSProperties}
          viewBox="0 0 1440 320"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d="M0 320L0 75L24 83L48 92L72 99L96 105L120 107L144 106L168 102L192 98L216 94L240 92L264 92L288 95L312 99L336 104L360 110L384 115L408 120L432 124L456 129L480 136L504 144L528 154L552 165L576 175L600 185L624 191L648 193L672 191L696 185L720 177L744 167L768 157L792 148L816 141L840 136L864 132L888 128L912 125L936 120L960 115L984 110L1008 106L1032 104L1056 104L1080 105L1104 108L1128 111L1152 113L1176 113L1200 109L1224 102L1248 92L1272 82L1296 73L1320 65L1344 60L1368 58L1392 59L1416 62L1440 66L1440 320Z" />
        </svg>
        <svg
          data-ridge
          className="landing-ridge-mid"
          style={{ "--i": 1 } as CSSProperties}
          viewBox="0 0 1440 320"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d="M0 320L0 145L24 147L48 148L72 149L96 154L120 163L144 177L168 194L192 212L216 226L240 234L264 235L288 232L312 227L336 223L360 221L384 220L408 219L432 215L456 208L480 200L504 193L528 189L552 191L576 196L600 201L624 204L648 202L672 194L696 183L720 171L744 160L768 153L792 149L816 147L840 143L864 139L888 135L912 134L936 137L960 147L984 163L1008 181L1032 197L1056 210L1080 216L1104 218L1128 217L1152 217L1176 218L1200 221L1224 222L1248 221L1272 217L1296 210L1320 203L1344 199L1368 199L1392 205L1416 212L1440 218L1440 320Z" />
        </svg>
        <svg
          data-ridge
          className="landing-ridge-near"
          style={{ "--i": 2 } as CSSProperties}
          viewBox="0 0 1440 320"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d="M0 320L0 250L24 256L48 261L72 268L96 275L120 279L144 277L168 271L192 264L216 262L240 265L264 271L288 275L312 273L336 266L360 257L384 250L408 244L432 239L456 231L480 222L504 214L528 211L552 217L576 229L600 241L624 250L648 254L672 255L696 257L720 261L744 266L768 268L792 268L816 266L840 265L864 269L888 277L912 283L936 284L960 277L984 266L1008 253L1032 244L1056 237L1080 232L1104 226L1128 220L1152 217L1176 220L1200 228L1224 239L1248 247L1272 250L1296 248L1320 245L1344 246L1368 251L1392 258L1416 264L1440 268L1440 320ZM663 259L671 232L678 259ZM258 275L266 248L274 275ZM1135 222L1142 205L1148 222ZM122 283L131 248L139 283ZM50 269L60 229L70 269ZM936 287L942 257L947 287ZM16 259L22 232L27 259ZM269 277L274 257L279 277ZM659 259L668 233L677 259ZM740 270L748 240L755 270ZM948 284L954 258L960 284ZM1427 271L1437 231L1446 271ZM1013 252L1019 230L1025 252ZM407 247L416 231L425 247ZM570 233L577 197L584 233ZM1375 258L1380 222L1385 258ZM295 278L302 241L309 278ZM1406 267L1412 243L1417 267ZM900 286L906 252L913 286ZM116 283L125 260L135 283ZM1085 234L1092 217L1098 234ZM137 281L146 265L154 281ZM249 273L256 244L263 273ZM269 277L275 244L280 277ZM920 289L927 272L934 289ZM297 278L307 257L316 278ZM1147 221L1157 199L1166 221ZM294 278L303 254L313 278ZM914 289L924 272L934 289ZM298 278L307 257L316 278ZM468 228L474 207L479 228ZM124 283L130 254L136 283ZM859 274L866 250L873 274ZM1373 259L1381 232L1389 259ZM1242 251L1248 232L1254 251ZM1302 250L1308 215L1314 250ZM264 277L273 244L283 277ZM274 278L283 240L293 278ZM864 275L869 250L875 275ZM50 267L56 228L62 267ZM1005 254L1015 234L1024 254ZM853 272L859 250L865 272ZM1031 246L1037 230L1043 246ZM797 271L805 235L814 271ZM397 249L404 211L410 249ZM17 260L24 239L31 260Z" />
        </svg>
      </div>
    </div>
  );
}

/** The marketing page at / for first-time visitors (T6.34). Saved work and old editor links go to /editor (App.tsx). */
export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  /** Work saved in this browser: the hero button picks it up in the editor (T6.67). */
  const [returning] = useState(() => loadSaved() !== null);
  const current = useSectionInView(sections);
  const navLink = (id: string) => ({
    href: `#${id}`,
    "aria-current": current === id ? ("location" as const) : undefined,
    className:
      "hover:text-moon aria-[current=location]:text-moon aria-[current=location]:underline aria-[current=location]:decoration-violet aria-[current=location]:decoration-2 aria-[current=location]:underline-offset-8",
  });

  // Every animation has a reduced-motion version: none at all (CLAUDE.md). GSAP and ScrollTrigger load lazily, through
  // the shared helper (T6.137).
  useEffect(
    () =>
      animate(
        root.current!,
        {
          // The hero card zooms out into a drifting collage of every look as you scroll (T6.124), on wide windows.
          "(min-width: 1024px)": (gsap) => {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: "[data-hero-stage]",
                start: "top top",
                end: "+=900",
                pin: true,
                scrub: 0.6,
              },
            });
            tl.to("[data-hero-card]", { scale: 0.56, ease: "none" }, 0)
              .to("[data-ridge]", { y: (i: number) => 40 + i * 50, ease: "none" }, 0)
              .fromTo("[data-collage]", { opacity: 0 }, { opacity: 1, ease: "none" }, 0)
              .fromTo(
                "[data-collage-row]:nth-child(odd)",
                { xPercent: 6 },
                { xPercent: -6, ease: "none" },
                0,
              )
              .fromTo(
                "[data-collage-row]:nth-child(even)",
                { xPercent: -6 },
                { xPercent: 6, ease: "none" },
                0,
              );
            // The looks section rises over the page on its curve.
            gsap.from("[data-curve]", {
              yPercent: 8,
              ease: "none",
              scrollTrigger: {
                trigger: "[data-curve]",
                start: "top bottom",
                end: "top 30%",
                scrub: true,
              },
            });
          },
          "": (gsap) => {
            gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) =>
              gsap.from(el, {
                y: 48,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 85%" },
              }),
            );
            gsap.fromTo(
              "[data-word]",
              { opacity: 0.4 }, // still 3:1 for this large text before it lights up (WCAG 1.4.3)
              {
                opacity: 1,
                stagger: 0.05,
                ease: "none",
                scrollTrigger: {
                  trigger: "[data-promise]",
                  start: "top 80%",
                  end: "bottom 45%",
                  scrub: true,
                },
              },
            );
          },
        },
        { plugins: [() => import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger)] },
      ),
    [],
  );

  return (
    <div ref={root} className="landing">
      <a
        href="#main"
        className="absolute -top-24 left-4 z-50 rounded-full bg-deep px-4 py-2 focus:top-4"
      >
        Skip to the page
      </a>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 top-4 z-40 mx-auto flex w-[min(64rem,calc(100%-2rem))] items-center justify-between gap-4 rounded-full border border-white/10 bg-night/70 py-2 pr-2 pl-5 backdrop-blur-md"
      >
        <Link to="/">
          <img src="/images/brand/logo.png" alt="Overlune home" width="120" height="36" />
        </Link>
        <ul className="hidden items-center gap-7 text-haze md:flex">
          <li>
            <a {...navLink("kit")}>Overlays</a>
          </li>
          <li>
            <a {...navLink("looks")}>Looks</a>
          </li>
          <li>
            <a {...navLink("how")}>How it works</a>
          </li>
          <li>
            <Link className="hover:text-moon" to="/guide">
              Setup guide
            </Link>
          </li>
        </ul>
        <Link
          to="/editor"
          className={`${button} bg-violet px-5 py-2.5 text-base text-night hover:bg-moon`}
        >
          Open the editor
        </Link>
      </nav>

      <main id="main" tabIndex={-1} className="w-full max-w-full overflow-x-clip outline-none">
        {/* Attention: text left, a live overlay beside it. The whole scene stays in view: its title sits at the
            bottom of the frame, so a scene hanging off the hero would hide it (T6.45). */}
        {/* The hero card, after the owner's reference (T6.124): on wide windows it zooms out into a drifting collage
            of every look as you scroll. */}
        <section className="landing-hero relative px-3 pt-24 md:px-6 md:pt-28">
          <div data-hero-stage className="relative flex min-h-[calc(100dvh-7rem)] items-center">
            <div data-collage aria-hidden className="landing-collage">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} data-collage-row className="landing-collage-row">
                  {themeIds.slice(row * 4, row * 4 + 4).map((id) => (
                    <div key={id} className="landing-collage-tile">
                      <Scene theme={id} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div
              data-hero-card
              className="landing-hero-card landing-sky relative z-10 mx-auto w-full max-w-[90rem] px-6 py-16 md:px-12 md:py-20"
            >
              <span aria-hidden className="landing-moon" />
              <HeroNight />
              <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div>
                  <h1 className="max-w-5xl font-heading text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[1.05] font-bold">
                    {headline.split(" ").map((word, i) => (
                      <Fragment key={i}>
                        {i > 0 && " "}
                        <span className="landing-word-mask">
                          <span className="landing-word" style={{ "--i": i } as CSSProperties}>
                            {word}
                          </span>
                        </span>
                      </Fragment>
                    ))}
                  </h1>
                  <p className="mt-8 max-w-xl text-xl leading-relaxed text-haze">
                    Pick a look, add your text, and paste one link per overlay into OBS. Four
                    scenes, from Starting Soon to Offline, plus chat and alerts, all matching.
                  </p>
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                      to="/editor"
                      className={`${button} landing-glow-button bg-violet text-night hover:bg-moon`}
                    >
                      {returning ? "Continue your overlay" : "Make your overlays"}
                    </Link>
                    <a
                      href="#looks"
                      className={`${button} border border-moon/40 text-moon hover:border-moon`}
                    >
                      See the looks
                    </a>
                  </div>
                  <ul
                    className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-haze"
                    aria-label="At a glance"
                  >
                    {facts.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span aria-hidden className="size-1.5 rounded-full bg-cyan" />
                        {f}
                      </li>
                    ))}
                    {/* Open source, higher on the page than the footer (T6.77). */}
                    <li className="flex items-center gap-2">
                      <span aria-hidden className="size-1.5 rounded-full bg-cyan" />
                      <a
                        href={repoUrl}
                        className="underline decoration-haze/50 underline-offset-4 hover:text-moon"
                      >
                        Open source
                      </a>
                    </li>
                  </ul>
                </div>
                <HeroKit />
              </div>
            </div>
          </div>
        </section>

        {/* Theme names, scrolling. A second copy makes the loop seamless and is hidden from screen readers. */}
        <div className="overflow-hidden border-y border-white/10 py-6" aria-label="Themes">
          <div className="landing-marquee flex w-max gap-12 font-heading text-3xl font-bold text-haze/70 md:text-5xl">
            {[0, 1].map((copy) => (
              <p key={copy} className="flex gap-12 pr-12" aria-hidden={copy === 1 || undefined}>
                {themeIds.map((id) => (
                  <span key={id}>{themes[id].name}</span>
                ))}
              </p>
            ))}
          </div>
        </div>

        {/* The seven overlays, each opening its part of the editor (T6.59): the scenes in one row, the overlays that
            sit over the game in a wider row under them (T6.148). */}
        <section id="kit" className="px-6 pt-24 md:px-12 md:pt-32" aria-labelledby="kit-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="kit-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Seven overlays in every look
            </h2>
            <p className="mt-4 max-w-xl text-lg text-haze">Open any of them in the editor.</p>
            {/* Tall cards, after the reference's services row (T6.124): the one under the pointer fills with violet from
                where the pointer is. Two tiers on wide windows, a bento after the 21st.dev galleries (T6.148). */}
            <ul className="landing-cards mt-12">
              {elements.map((e) => (
                <li key={e.part} data-part={e.part}>
                  <Link
                    to={`/editor?part=${e.part}`}
                    className="landing-card group"
                    onPointerMove={(ev) => {
                      const r = ev.currentTarget.getBoundingClientRect();
                      ev.currentTarget.style.setProperty("--mx", `${ev.clientX - r.left}px`);
                      ev.currentTarget.style.setProperty("--my", `${ev.clientY - r.top}px`);
                    }}
                  >
                    <span aria-hidden className="landing-card-arrow">
                      <Icon name="arrow" />
                    </span>
                    <Magnified part={e.part} theme={e.theme} />
                    <div className="relative mt-auto pt-6">
                      <h3 className="font-heading text-2xl font-bold">{e.name}</h3>
                      <p className="mt-2 text-haze group-hover:text-moon">{e.line}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Interest (T6.124): the whole kit over a game in one look, with the look switchable. */}
        <section
          id="stage"
          className="px-6 py-32 md:px-12 md:py-48"
          aria-labelledby="stage-heading"
        >
          <StreamStage />
        </section>

        {/* Desire: the title stays put while every look scrolls past. */}
        <section
          id="looks"
          data-curve
          className="landing-curve relative px-6 py-32 md:px-12 md:py-40"
          aria-labelledby="looks-heading"
        >
          <LooksShowcase />
        </section>

        {/* How it works: three numbered stops on a line that draws as the steps scroll in (T6.148). */}
        <section id="how" className="px-6 py-24 md:px-12 md:py-32" aria-labelledby="how-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="how-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Live in three steps
            </h2>
            {/* Numbered stops on one line, after 21st.dev's "How It Works Steps" (behavior only, T6.148). */}
            <ol className="landing-steps mt-16">
              {steps.map(([title, text], i) => (
                <li key={title} style={{ "--i": i } as CSSProperties}>
                  <span aria-hidden className="landing-step-num">
                    {i + 1}
                  </span>
                  <h3 className="mt-6 font-heading text-2xl font-bold">{title}</h3>
                  <p className="mt-2 max-w-xs text-haze md:mx-auto">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What works where (T6.79): one row per overlay, one column per platform, said in words. */}
        <section
          id="works"
          className="px-6 pb-24 md:px-12 md:pb-32"
          aria-labelledby="works-heading"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              id="works-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              What works where
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-haze">
              Every overlay runs as a Browser source in OBS Studio or Streamlabs Desktop. The scenes
              work wherever you stream; chat and alerts read your Twitch channel.
            </p>
            {/* After 21st.dev's "Feature Comparison Table" (behavior only, T6.152): rows grouped under a heading,
                ticks and crosses, and the best-supported platform's column lit. */}
            <div
              tabIndex={0}
              role="region"
              aria-label="What works where, by platform"
              className="relative mt-10 overflow-x-auto rounded-3xl border border-white/10 bg-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet"
            >
              <table className="landing-support w-full min-w-[34rem] border-collapse text-left">
                <caption className="sr-only">Which overlays work on which platform</caption>
                <thead>
                  <tr className="border-b border-white/10">
                    <th
                      scope="col"
                      className="p-3 align-bottom font-heading text-sm text-haze md:p-4 md:px-6 md:text-base"
                    >
                      Overlay
                    </th>
                    {platforms.map((name, i) => (
                      <th
                        key={name}
                        scope="col"
                        data-lit={i === 0 || undefined}
                        className="p-3 text-center align-bottom font-heading text-sm md:p-4 md:px-6 md:text-base"
                      >
                        {i === 0 && <span className="landing-support-badge">Best supported</span>}
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                {support.map(({ group, rows }) => (
                  <tbody key={group}>
                    <tr className="border-b border-white/10 bg-night/50">
                      <th
                        scope="colgroup"
                        colSpan={4}
                        className="px-3 py-2 text-sm font-bold text-moon md:px-6"
                      >
                        {group}
                      </th>
                    </tr>
                    {rows.map((row) => (
                      <tr key={row.overlay} className="border-b border-white/10">
                        <th scope="row" className="p-3 align-top font-normal md:p-4 md:px-6">
                          <span className="block font-heading text-lg font-bold">
                            {row.overlay}
                          </span>
                          <span className="text-sm text-haze">{row.detail}</span>
                        </th>
                        {row.on.map((value, i) => (
                          <td
                            key={platforms[i]}
                            data-lit={i === 0 || undefined}
                            className="p-3 text-center align-middle text-haze md:p-4 md:px-6"
                          >
                            <SupportCell value={value} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            <p className="mt-4 max-w-2xl text-sm text-haze">
              “Not yet” means it’s planned for a later version, not that it works today.
            </p>
          </div>
        </section>

        {/* Good to know (T6.69). A heading beside a ruled list, not three equal cards. */}
        <section id="know" className="px-6 pb-32 md:px-12 md:pb-48" aria-labelledby="know-heading">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <h2
              id="know-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Good to know
            </h2>
            {/* Questions that open in place, with round toggles, after the reference's FAQ (T6.124). */}
            <div className="divide-y divide-white/10 border-y border-white/10">
              {goodToKnow.map(([term, text]) => (
                <details key={term} className="landing-faq group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-heading text-xl font-bold">
                    {term}
                    <span aria-hidden className="landing-faq-toggle" />
                  </summary>
                  <p className="m-0 max-w-2xl pb-6 text-haze">{text}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* The words light up as you scroll. */}
        <section className="px-6 pb-32 md:px-12 md:pb-48">
          <p
            data-promise
            className="mx-auto max-w-5xl font-heading text-[clamp(1.75rem,3.2vw,2.75rem)] leading-snug font-bold"
          >
            {promise.split(" ").map((word, i) => (
              <span key={i} data-word>
                {word}{" "}
              </span>
            ))}
          </p>
        </section>

        {/* Action. */}
        <section id="start" className="px-3 pb-6 md:px-6" aria-labelledby="cta-heading">
          {/* After 21st.dev's "CTA Banner" (behavior only, T6.152): corner brackets, scanlines and a slow scan. */}
          <div className="landing-cta mx-auto max-w-[90rem] px-6 pt-20 pb-24 text-center md:px-12 md:pt-28 md:pb-32">
            <h2
              id="cta-heading"
              data-reveal
              className="mx-auto max-w-5xl font-heading text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] font-bold"
            >
              Make your stream look pro.
            </h2>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <Link
                to="/editor"
                className={`${button} bg-violet px-10 py-5 text-xl text-night hover:bg-moon`}
              >
                Make your overlays
              </Link>
              <Link
                to="/guide"
                className={`${button} border border-moon/40 px-10 py-5 text-xl text-moon hover:border-moon`}
              >
                Read the setup guide
              </Link>
            </div>
            <p className="mt-6 text-haze">Free. No account. Works with OBS and Streamlabs.</p>
            {/* Optional, quiet, and after the call to action: nothing is locked (T6.80). */}
            <p className="mx-auto mt-3 max-w-xl text-sm text-haze">
              Overlune is free and stays free. If it helped your stream, you can{" "}
              <a
                href={supportUrl}
                className="underline decoration-haze/50 underline-offset-4 hover:text-moon"
              >
                support it on GitHub Sponsors
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Ruler />
    </div>
  );
}
