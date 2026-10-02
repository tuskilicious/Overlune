import { useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { testAlerts } from "../alerts/events";
import SiteFooter from "../components/SiteFooter";
import { chatSamples } from "../editor/chat-samples";
import Preview from "../editor/Preview";
import AlertView from "../overlays/alerts/AlertView";
import ChatView from "../overlays/chat/ChatView";
import StartingSoon from "../overlays/starting/StartingSoon";
import { defaultSettings, type Settings } from "../settings/schema";
import { themes } from "../themes";
import { themeIds, type ThemeId } from "../themes/types";
import "../editor/brand"; // brand fonts (Quicksand, Nunito)
import "./landing.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const look = (theme: ThemeId): Settings => ({ ...defaultSettings, theme });

/** A theme's real Starting Soon scene as a picture. `live` keeps its motion (the hero); the rest hold still. */
function Scene({ theme, live = false }: { theme: ThemeId; live?: boolean }) {
  return (
    <div className={live ? undefined : "landing-still"}>
      <Preview>
        <StartingSoon settings={look(theme)} />
      </Preview>
    </div>
  );
}

const steps = [
  ["Pick a look", "Eight themes, each with matching scenes, chat and alerts."],
  ["Add your details", "Your title, countdown, socials and Twitch channel name."],
  ["Paste into OBS", "Copy each link into a Browser source. The setup guide shows how."],
] as const;

const promise =
  "No account and no payment. Your settings live in your link and your browser, your chat is read anonymously, and the code is open source.";

const button =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-heading text-lg font-bold transition-colors duration-300";

/** The marketing page at / for first-time visitors (T6.34). Saved work and old editor links go to /editor (App.tsx). */
export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

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
        // Each look grows in as it arrives and dims as it leaves.
        gsap.utils.toArray<HTMLElement>("[data-look]").forEach((el) =>
          gsap
            .timeline({
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
            })
            .fromTo(el, { scale: 0.8, opacity: 0.4 }, { scale: 1, opacity: 1, ease: "none" })
            .to(el, { opacity: 0.2, ease: "none" }, 0.75),
        );
      });
      // Pinning needs room: only on wide windows.
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
        ScrollTrigger.create({
          trigger: "[data-gallery]",
          start: "top top",
          end: "bottom bottom",
          pin: "[data-gallery-title]",
          pinSpacing: false,
        });
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
            <a className="hover:text-moon" href="#looks">
              Looks
            </a>
          </li>
          <li>
            <a className="hover:text-moon" href="#how">
              How it works
            </a>
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
        {/* Attention: text left, a live overlay floating in from the bottom right. */}
        <section className="landing-ambient relative px-6 pt-40 pb-32 md:px-12 md:pt-48 md:pb-48">
          <div className="relative z-10 mx-auto max-w-7xl">
            <h1 className="max-w-5xl font-heading text-[clamp(2.75rem,5.5vw,5.25rem)] leading-[1.05] font-bold">
              Free stream overlays that look pro.
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-haze">
              Pick a look, add your text, and paste one link per overlay into OBS. Starting Soon, Be
              Right Back, Stream Ending, chat and alerts, all matching.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/editor" className={`${button} bg-violet text-night hover:bg-moon`}>
                Make your overlays
              </Link>
              <a
                href="#looks"
                className={`${button} border border-moon/40 text-moon hover:border-moon`}
              >
                See the looks
              </a>
            </div>
          </div>
          <figure className="relative mx-auto mt-16 w-full max-w-3xl md:absolute md:right-[-4rem] md:bottom-[-6rem] md:mt-0 md:w-[46vw] md:rotate-[-3deg]">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <Scene theme="vaporwave-sunset" live />
            </div>
            <figcaption className="sr-only">The Vaporwave Sunset Starting Soon scene.</figcaption>
          </figure>
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

        {/* Interest: four cards, 4 × 2 cells, no gaps (A 2×2, B 2×1, C 1×1, D 1×1). */}
        <section className="px-6 py-32 md:px-12 md:py-48" aria-labelledby="bento-heading">
          <div className="mx-auto max-w-7xl">
            <h2
              id="bento-heading"
              data-reveal
              className="max-w-5xl font-heading text-[clamp(2.25rem,4.5vw,4rem)] leading-tight font-bold"
            >
              One {/* A slice through the middle of a real scene, inside the heading. */}
              <span className="mx-1 inline-flex h-[0.8em] w-[2.4em] items-center overflow-hidden rounded-full align-middle">
                <span className="w-full shrink-0">
                  <Scene theme="cozy-cafe" />
                </span>
              </span>{" "}
              look, every overlay to match.
            </h2>
            <ul className="mt-16 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
              <li className="group flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6 md:col-span-2 md:row-span-2">
                <div>
                  <h3 className="font-heading text-2xl font-bold">Eight looks, ready to go</h3>
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
              <li className="group flex gap-6 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6 md:col-span-2">
                <div className="flex-1">
                  <h3 className="font-heading text-2xl font-bold">Chat in your colors</h3>
                  <p className="mt-2 text-haze">
                    Your Twitch chat, styled to match. Bots and commands stay out of it.
                  </p>
                </div>
                <div className="landing-still w-36 shrink-0 overflow-hidden rounded-xl transition-transform duration-700 ease-out group-hover:scale-105">
                  <Preview width={400} height={600}>
                    <ChatView settings={look("pastel-cloud")} messages={chatSamples} />
                  </Preview>
                </div>
              </li>
              <li className="group flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-white/10 bg-deep p-6">
                <div>
                  <h3 className="font-heading text-2xl font-bold">Alerts with sound</h3>
                  <p className="mt-2 text-haze">
                    Raids, subs, gift subs and bits, each with its look’s sound.
                  </p>
                </div>
                <div className="landing-still mt-4 overflow-hidden rounded-xl bg-night transition-transform duration-700 ease-out group-hover:scale-105">
                  {/* Only the top of the 1920×1080 canvas, where the alert sits. */}
                  <Preview height={300}>
                    <AlertView settings={look("bold-esports")} alert={testAlerts[0]!} />
                  </Preview>
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
          data-gallery
          className="relative px-6 md:px-12"
          aria-labelledby="looks-heading"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div data-gallery-title className="lg:h-screen lg:pt-40">
              <h2
                id="looks-heading"
                className="font-heading text-[clamp(2.25rem,4vw,3.5rem)] leading-tight font-bold"
              >
                Eight looks. Every scene matches.
              </h2>
              <p className="mt-6 max-w-md text-lg text-haze">
                Pick one and your Starting Soon, Be Right Back and Stream Ending scenes, chat and
                alerts all change together. Switch any time.
              </p>
              <Link
                to="/editor"
                className={`${button} mt-8 border border-moon/40 text-moon hover:border-moon`}
              >
                Try them in the editor
              </Link>
            </div>
            <ul className="flex flex-col gap-16 pb-32 lg:py-40">
              {themeIds.map((id) => (
                <li key={id} className="group">
                  {/* Only the picture grows and dims; the name stays at full contrast. */}
                  <div data-look className="overflow-hidden rounded-3xl border border-white/10">
                    <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                      <Scene theme={id} />
                    </div>
                  </div>
                  <p className="mt-4 font-heading text-2xl font-bold">{themes[id].name}</p>
                </li>
              ))}
            </ul>
          </div>
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
            <ol className="mt-12 flex flex-col gap-4 md:h-80 md:flex-row">
              {steps.map(([title, text], i) => (
                <li
                  key={title}
                  tabIndex={0}
                  className="group flex flex-col justify-end rounded-3xl border border-white/10 bg-deep p-8 transition-[flex-grow] duration-500 ease-out hover:grow-[2.5] focus:grow-[2.5] md:grow"
                >
                  <span aria-hidden className="font-heading text-6xl font-bold text-violet">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-heading text-2xl font-bold">{title}</h3>
                  <p className="mt-2 max-w-sm text-haze">{text}</p>
                </li>
              ))}
            </ol>
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
          className="landing-ambient px-6 py-32 text-center md:px-12 md:py-48"
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
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
