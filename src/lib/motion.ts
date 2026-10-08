import { useCallback, useEffect, useRef, useState } from "react";
import type { gsap as GsapType } from "gsap";

export type Gsap = typeof GsapType;
type Context = ReturnType<Gsap["context"]>;

/** A GSAP plugin, loaded with GSAP: `() => import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger)`. Keep the list
 *  in a module-level constant, so it's the same array on every render. */
export type PluginLoader = () => Promise<object>;

/** A sequence gets GSAP, its matchMedia context and the loaded plugins (in the order given). It may return a cleanup,
 *  which runs when it's reverted. */
type Sequence = (gsap: Gsap, context: Context, plugins: object[]) => void | (() => void);

const rmSet = () => "rm" in document.documentElement.dataset;

/**
 * The only way to use GSAP (T6.137). GSAP itself is a dynamic import, so it never lands in the editor's or an
 * overlay's entry bundle (tests/e2e/landing.spec.ts checks the budgets).
 *
 * Each sequence runs inside gsap.matchMedia("(prefers-reduced-motion: no-preference)"), plus the extra media query in
 * its key ("" for none), scoped to `scope`. Every reduced-motion route stops it the same way: the OS setting, ?rm=1
 * and the Still motion setting in a link (both set html[data-rm], main.tsx and FromLink.tsx), or `still` from the
 * caller (the editor's Still). If one turns on later, everything is reverted.
 *
 * Returns a cleanup that reverts and kills every tween and ScrollTrigger it made: call it on unmount.
 */
export function animate(
  scope: Element,
  sequences: Record<string, Sequence>,
  { still = false, plugins = [] }: { still?: boolean; plugins?: PluginLoader[] } = {},
): () => void {
  // Motion off from the start (the OS setting, ?rm=1, Still): GSAP isn't even downloaded.
  if (still || rmSet() || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let mm: ReturnType<Gsap["matchMedia"]> | undefined;
  let done = false;
  const stop = () => {
    done = true;
    mm?.revert();
    watch.disconnect();
  };
  // ?rm=1 is set before React runs, but the Still setting can change while an overlay is open.
  const watch = new MutationObserver(() => rmSet() && stop());
  watch.observe(document.documentElement, { attributeFilter: ["data-rm"] });
  void Promise.all([import("gsap"), ...plugins.map((load) => load())]).then(
    ([{ gsap }, ...loaded]) => {
      if (done) return;
      gsap.registerPlugin(...loaded);
      mm = gsap.matchMedia(scope);
      for (const [query, setup] of Object.entries(sequences))
        mm.add(
          `(prefers-reduced-motion: no-preference)${query ? ` and ${query}` : ""}`,
          (context) => setup(gsap, context, loaded),
        );
    },
  );
  return stop;
}

/** What run() plays: GSAP, the loaded plugins and the scope element, inside the reduced-motion context. */
export type Play = (gsap: Gsap, plugins: object[], scope: Element) => void;

/**
 * Animations started by events (T6.137): a click, a filter, a hover. Put the returned ref on the element the
 * animations live in; GSAP loads lazily once that element is on the page (a callback ref, so an element that appears
 * later, like the editor behind the welcome gallery, still gets it). run(play) plays inside the same context as
 * animate(), so unmount reverts it (GSAP's contextSafe pattern). While motion is off, or GSAP is still loading, or
 * `query` doesn't match, run() does nothing and the change simply shows at once, which is also the reduced-motion
 * version.
 */
export function useMotion({
  still = false,
  plugins,
  query = "",
}: { still?: boolean; plugins?: PluginLoader[]; query?: string } = {}): [
  ref: (el: Element | null) => void,
  run: (play: Play) => void,
] {
  const [scope, setScope] = useState<Element | null>(null);
  const runner = useRef<((play: Play) => void) | null>(null);
  useEffect(() => {
    if (!scope) return;
    return animate(
      scope,
      {
        [query]: (gsap, context, loaded) => {
          runner.current = context.add("run", (play: Play) => play(gsap, loaded, scope)) as (
            play: Play,
          ) => void;
          return () => {
            runner.current = null;
          };
        },
      },
      { still, plugins },
    );
  }, [scope, still, plugins, query]);
  return [setScope, useCallback((play: Play) => runner.current?.(play), [])];
}
