import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { testAlerts } from "../alerts/events";
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

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Previews still waiting, built one per idle moment after the page has loaded, so they're ready before anyone
 *  scrolls to them without blocking the load or a scroll (T6.78). */
const waiting: (() => void)[] = [];
let idleScheduled = false;
function buildWhenIdle() {
  if (idleScheduled || !waiting.length) return;
  idleScheduled = true;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200)); // Safari has none
  idle(() => {
    idleScheduled = false;
    waiting.shift()?.();
    buildWhenIdle();
  });
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

type KitScene = "starting" | "brb" | "ending";

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

/** One scene of a look, live (TextScene for BRB and Stream Ending). */
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
};

/** The hero frame's tour: a look and a scene each, so it shows the whole kit over time (T6.59). */
const tour: [ThemeId, KitScene][] = [
  ["vaporwave-sunset", "starting"],
  ["cozy-cafe", "brb"],
  ["neon-grid", "ending"],
  ["pastel-cloud", "starting"],
  ["forest-night", "brb"],
  ["bold-esports", "ending"],
  ["arcade-8bit", "starting"],
  ["clean-slate", "brb"],
  ["daylight", "ending"],
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

/** The five overlays, each a live thumbnail that opens its part of the editor (T6.59). */
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
              frame: { width: 640, height: 360, label: "yourname" },
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
const support: { overlay: string; detail: string; on: [Support, Support, Support] }[] = [
  {
    overlay: "Scenes",
    detail: "Starting Soon, Be Right Back, Stream Ending",
    on: ["Yes", "Yes", "Yes"],
  },
  { overlay: "Chat", detail: "Your chat, in your look", on: ["Yes", "Not yet", "Not yet"] },
  { overlay: "Webcam frame", detail: "A border for your camera", on: ["Yes", "Yes", "Yes"] },
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
];

const facts = ["9 looks", "Scenes, chat and alerts", "One link per overlay", "Free, no account"];

const steps = [
  ["Pick a look", "Nine looks, each with matching scenes, chat and alerts."],
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

/** One orbit every 30 seconds while the pointer is over the ring (T6.105). */
const ORBIT_SPEED = (Math.PI * 2) / 30;

/**
 * The nine looks orbiting their heading (T6.105), an original take on the "headline ringed by plates" idea, with the
 * real looks as the plates. From 1024px the cards sit on an ellipse round the copy: front ones pass over it, back ones
 * dim behind it, and every card keeps facing you. The ring rests until the pointer is over it, eases up to one orbit
 * every 30 seconds and eases back to a stop on leave. Reduced motion: it stays still. Narrower windows: a plain grid.
 */
function LooksRing() {
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  /** The look shown full screen (T6.106). */
  const [open, setOpen] = useState<ThemeId | null>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d || !open) return;
    d.showModal();
    // The dialog keeps focus and Esc; its body goes full screen (Chrome won't for a dialog itself).
    // iPhones can't put an element full screen; the dialog still fills the window there.
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
  }, [open]);
  // Leave full screen first (that closes the dialog, as Esc does), so focus returns to the look.
  const close = () =>
    document.fullscreenElement ? void document.exitFullscreen() : dialog.current?.close();
  useEffect(() => {
    const root = stage.current!;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-ring-card]")];
    const wide = matchMedia("(min-width: 1024px)");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let angle = 0,
      speed = 0,
      target = 0,
      frame = 0,
      last = 0,
      visible = false;
    const place = () => {
      if (!wide.matches) {
        for (const c of cards) c.removeAttribute("style");
        return;
      }
      const rx = Math.min(480, root.clientWidth / 2 - 160);
      // The back half rises higher than the front half dips, so cards behind the copy clear the headline.
      const front = 230,
        back = 330;
      // The ring sits lower than the copy so front cards pass under its button; the pair is raised together (the
      // copy's padding below) so the group is centered in the stage.
      const dy = 18;
      cards.forEach((c, i) => {
        const a = angle + (i / cards.length) * Math.PI * 2;
        const depth = Math.cos(a); // 1 in front (bottom), -1 at the back (top)
        const t = (depth + 1) / 2;
        const y = depth * (depth > 0 ? front : back) + dy;
        c.style.transform = `translate(-50%, -50%) translate(${Math.sin(a) * rx}px, ${y}px) scale(${0.55 + 0.45 * t})`;
        // Dimmed, not faded: a faded card would show the cards and labels behind it.
        c.style.filter = `brightness(${0.3 + 0.7 * t})`;
        c.style.zIndex = String(depth > 0 ? 20 + Math.round(t * 10) : 1 + Math.round(t * 4));
      });
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      speed += (target - speed) * Math.min(1, dt * 2.5); // ease towards the target speed
      angle += speed * dt;
      place();
      frame = visible && (target > 0 || speed > 0.0005) ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };
    const run = () => {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };
    const enter = () => {
      if (still.matches || !wide.matches) return;
      target = ORBIT_SPEED;
      run();
    };
    const leave = () => {
      target = 0;
      run();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      if (visible) run();
    });
    io.observe(root);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    wide.addEventListener("change", place);
    place();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      wide.removeEventListener("change", place);
    };
  }, []);
  return (
    <div ref={stage} className="landing-ring relative mx-auto max-w-7xl lg:h-[48rem]">
      <div className="relative z-10 text-center lg:pointer-events-none lg:absolute lg:inset-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:pb-[94px]">
        <h2
          id="looks-heading"
          className="mx-auto max-w-[34rem] font-heading text-[clamp(2.25rem,4vw,3.5rem)] leading-tight font-bold"
        >
          Nine looks. Every scene matches.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lg text-haze">
          Pick one and your Starting Soon, Be Right Back and Stream Ending scenes, chat and alerts
          all change together. Switch any time.
        </p>
        <Link
          to="/editor"
          className={`${button} mt-8 border border-moon/40 text-moon hover:border-moon lg:pointer-events-auto`}
        >
          Try them in the editor
        </Link>
      </div>
      <ul className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:mt-0">
        {themeIds.map((id) => (
          <li key={id} data-ring-card className="landing-ring-card">
            <div data-look className="overflow-hidden rounded-2xl border border-white/10">
              <Scene theme={id} />
            </div>
            <p className="mt-3 font-heading text-xl font-bold">{themes[id].name}</p>
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in rounded-2xl"
              aria-label={`See ${themes[id].name} full screen`}
              onClick={() => setOpen(id)}
            />
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className="landing-look-full"
        aria-label={open ? `${themes[open].name}, full screen` : undefined}
        onClose={() => setOpen(null)}
      >
        <div ref={screen} className="landing-look-full-body">
          {open && (
            <>
              <div className="landing-look-full-stage">
                <Preview>
                  <StartingSoon settings={sampleScene(open)} />
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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Every animation has a reduced-motion version: none at all (CLAUDE.md).
      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
      });
    },
    { scope: root },
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

      <main id="main" tabIndex={-1} className="w-full max-w-full overflow-x-hidden outline-none">
        {/* Attention: text left, a live overlay beside it. The whole scene stays in view: its title sits at the
            bottom of the frame, so a scene hanging off the hero would hide it (T6.45). */}
        <section className="landing-ambient landing-sky relative px-6 pt-40 pb-32 md:px-12 md:pt-48 md:pb-48">
          <span aria-hidden className="landing-moon" />
          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div>
              <h1 className="max-w-5xl font-heading text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[1.05] font-bold">
                Free stream overlays that look pro.
              </h1>
              <p className="mt-8 max-w-xl text-xl leading-relaxed text-haze">
                Pick a look, add your text, and paste one link per overlay into OBS. Starting Soon,
                Be Right Back, Stream Ending, chat and alerts, all matching.
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

        {/* The six overlays, each opening its part of the editor (T6.59), in two rows of three. */}
        <section id="kit" className="px-6 pt-32 md:px-12 md:pt-48" aria-labelledby="kit-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="kit-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Six overlays in every look
            </h2>
            <p className="mt-4 max-w-xl text-lg text-haze">Open any of them in the editor.</p>
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {elements.map((e) => (
                <li key={e.part}>
                  <Link
                    to={`/editor?part=${e.part}`}
                    className="group block h-full rounded-3xl border border-white/10 bg-deep p-4 transition-colors hover:border-violet"
                  >
                    <div className="landing-still aspect-video overflow-hidden rounded-xl bg-night">
                      <ElementShot part={e.part} theme={e.theme} />
                    </div>
                    <h3 className="mt-4 font-heading text-xl font-bold">{e.name}</h3>
                    <p className="mt-1 text-haze">{e.line}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Interest: four cards. From 1280px, 4 × 2 cells with no gaps (A 2×2, B 2×1, C 1×1, D 1×1); from 768px,
            two columns with A and B full width (T6.56); below that, one column. */}
        <section className="px-6 py-32 md:px-12 md:py-48" aria-labelledby="bento-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="bento-heading"
              data-reveal
              className="max-w-5xl font-heading text-[clamp(2.25rem,4.5vw,4rem)] leading-tight font-bold"
            >
              One{" "}
              {/* A slice of a real scene inside the heading: Neon Grid's lower half, with the title, the glowing
                  horizon and the grid floor. Scenes are empty in the middle since the redesign (T6.46). */}
              <span className="mx-1 inline-flex h-[0.8em] w-[2.4em] items-end overflow-hidden rounded-full border border-white/10 align-middle">
                <span className="w-full shrink-0">
                  <Scene theme="neon-grid" />
                </span>
              </span>{" "}
              look, every overlay to match.
            </h2>
            <ul className="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2">
              <li className="group flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6 md:col-span-2 xl:row-span-2">
                <div>
                  <h3 className="font-heading text-2xl font-bold">Nine looks, ready to go</h3>
                  <p className="mt-2 text-haze">
                    Every theme is free, with fonts and sounds licensed for streaming.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["clean-slate", "cozy-cafe", "arcade-8bit", "forest-night"] as const).map(
                    (id) => (
                      <div key={id} className="overflow-hidden rounded-xl">
                        <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                          <Scene theme={id} />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </li>
              {/* On phones the chat picture sits under the text, so neither is squeezed (T6.57). */}
              <li className="group flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6 md:col-span-2 md:flex-row">
                <div className="flex-1">
                  <h3 className="font-heading text-2xl font-bold">Chat in your colors</h3>
                  <p className="mt-2 text-haze">
                    Your Twitch chat, styled to match. Bots and commands stay out of it.
                  </p>
                </div>
                <div className="landing-still w-60 shrink-0 self-center overflow-hidden rounded-xl transition-transform duration-700 ease-out group-hover:scale-105 md:w-36 md:self-auto">
                  <LazyPreview width={400} height={600}>
                    <ChatView settings={sampleScene("pastel-cloud")} messages={chatSamples} />
                  </LazyPreview>
                </div>
              </li>
              <li className="group flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6">
                <div>
                  <h3 className="font-heading text-2xl font-bold">Alerts with sound</h3>
                  <p className="mt-2 text-haze">
                    Raids, subs, gift subs and bits, each with its look’s sound.
                  </p>
                </div>
                <div className="landing-still landing-alert mt-4 flex flex-col gap-3 transition-transform duration-700 ease-out group-hover:scale-105">
                  {/* Just the alert cards, cropped from their 1920×1080 canvases so the text is readable, in two
                      looks (T6.48). */}
                  {(
                    [
                      ["bold-esports", 0],
                      ["cozy-cafe", 1],
                    ] as const
                  ).map(([theme, i]) => (
                    <div key={theme} className="overflow-hidden rounded-xl">
                      <LazyPreview width={1000} height={200}>
                        <AlertView settings={sampleScene(theme)} alert={testAlerts[i]!} />
                      </LazyPreview>
                    </div>
                  ))}
                </div>
              </li>
              <li className="rounded-3xl border border-white/10 bg-violet p-6 text-night">
                <h3 className="font-heading text-2xl font-bold">Your link is your save file</h3>
                <p className="mt-2">
                  No account to make. Bookmark the editor and come back any time.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* Desire: the title stays put while every look scrolls past. */}
        <section
          id="looks"
          className="relative px-6 py-32 md:px-12 md:py-40"
          aria-labelledby="looks-heading"
        >
          <LooksRing />
        </section>

        {/* How it works: slices that widen on hover or focus. */}
        <section id="how" className="px-6 py-32 md:px-12 md:py-48" aria-labelledby="how-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="how-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Live in three steps
            </h2>
            <ol className="mt-12 flex flex-col gap-4 md:flex-row">
              {steps.map(([title, text], i) => (
                <li
                  key={title}
                  tabIndex={0}
                  className="group flex flex-col gap-10 rounded-3xl border border-white/10 bg-deep p-8 transition-[flex-grow] duration-500 ease-out hover:grow-[2.5] focus:grow-[2.5] md:grow"
                >
                  <span aria-hidden className="font-heading text-6xl font-bold text-violet">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-2xl font-bold">{title}</h3>
                    <p className="mt-2 max-w-sm text-haze">{text}</p>
                  </div>
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
            <div className="mt-10 overflow-x-auto rounded-3xl border border-white/10 bg-deep">
              <table className="w-full min-w-[22rem] border-collapse text-left">
                <caption className="sr-only">Which overlays work on which platform</caption>
                <thead>
                  <tr className="border-b border-white/10">
                    <th
                      scope="col"
                      className="p-3 font-heading text-sm text-haze md:p-4 md:px-6 md:text-base"
                    >
                      Overlay
                    </th>
                    {platforms.map((name) => (
                      <th
                        key={name}
                        scope="col"
                        className="p-3 font-heading text-sm md:p-4 md:px-6 md:text-base"
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {support.map((row) => (
                    <tr key={row.overlay} className="border-b border-white/10 last:border-b-0">
                      <th scope="row" className="p-3 align-top font-normal md:p-4 md:px-6">
                        <span className="block font-heading text-lg font-bold">{row.overlay}</span>
                        <span className="text-sm text-haze">{row.detail}</span>
                      </th>
                      {row.on.map((s, i) => (
                        <td
                          key={platforms[i]}
                          data-support={s}
                          className="p-3 align-top data-[support=No]:text-haze/80 data-[support=Not_yet]:text-haze md:p-4 md:px-6"
                        >
                          {s === "Yes" && (
                            <span
                              aria-hidden
                              className="mr-2 inline-block size-2 rounded-full bg-cyan align-middle"
                            />
                          )}
                          {s}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-2xl text-sm text-haze">
              “Not yet” means it’s planned for a later version, not that it works today.
            </p>
          </div>
        </section>

        {/* Good to know (T6.69). A heading beside a ruled list, not three equal cards. */}
        <section className="px-6 pb-32 md:px-12 md:pb-48" aria-labelledby="know-heading">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <h2
              id="know-heading"
              data-reveal
              className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] font-bold"
            >
              Good to know
            </h2>
            <dl className="divide-y divide-white/10 border-y border-white/10">
              {goodToKnow.map(([term, text]) => (
                <div
                  key={term}
                  className="grid gap-2 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8"
                >
                  <dt className="font-heading text-xl font-bold">{term}</dt>
                  <dd className="m-0 text-haze">{text}</dd>
                </div>
              ))}
            </dl>
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
        <section
          className="landing-ambient px-6 pt-16 pb-32 text-center md:px-12 md:pt-24 md:pb-48"
          aria-labelledby="cta-heading"
        >
          <h2
            id="cta-heading"
            data-reveal
            className="mx-auto max-w-5xl font-heading text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] font-bold"
          >
            Make your stream look pro.
          </h2>
          <Link
            to="/editor"
            className={`${button} mt-12 bg-violet px-10 py-5 text-xl text-night hover:bg-moon`}
          >
            Make your overlays
          </Link>
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
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
