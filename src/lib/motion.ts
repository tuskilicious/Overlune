import type { gsap as GsapType } from "gsap";

export type Gsap = typeof GsapType;

/** A GSAP plugin, loaded with GSAP: `() => import("gsap/ScrollTrigger").then((m) => m.ScrollTrigger)`. */
type PluginLoader = () => Promise<object>;

const rmSet = () => "rm" in document.documentElement.dataset;

/**
 * The only way to use GSAP (T6.137). GSAP itself is a dynamic import, so it never lands in the editor's or an
 * overlay's entry bundle (tests/e2e/landing.spec.ts checks the budgets).
 *
 * Each sequence runs inside gsap.matchMedia("(prefers-reduced-motion: no-preference)"), plus the extra media query in
 * its key ("" for none), scoped to `scope`. Every reduced-motion route stops it the same way: the OS setting, ?rm=1
 * and the Still motion setting in a link (both set html[data-rm], main.tsx and FromLink.tsx), or `still` from the
 * caller (the editor preview's Still). If one turns on later, everything is reverted.
 *
 * Returns a cleanup that reverts and kills every tween and ScrollTrigger it made: call it on unmount.
 */
export function animate(
  scope: Element,
  sequences: Record<string, (gsap: Gsap) => void>,
  { still = false, plugins = [] }: { still?: boolean; plugins?: PluginLoader[] } = {},
): () => void {
  if (still || rmSet()) return () => {};
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
        mm.add(`(prefers-reduced-motion: no-preference)${query ? ` and ${query}` : ""}`, () =>
          setup(gsap),
        );
    },
  );
  return stop;
}
