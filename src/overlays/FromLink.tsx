import { Fragment, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import type { Settings } from "../settings/schema";
import { decode } from "../settings/url";
import { CanvasContext, linkCanvas } from "./measure";
import OverlayError from "./OverlayError";

/** Overlay route: reads settings from the link. A damaged link still renders (bad fields fall back) with the error card. */
export default function FromLink({
  replay = false,
  children,
}: {
  /** A full-screen scene: its entrance plays again each time OBS shows it live (the overlay playbook). Not for chat,
   *  alerts or Live, whose remount would drop chat's connection and messages. */
  replay?: boolean;
  children: (settings: Settings, error: ReactNode) => ReactNode;
}) {
  const { hash, search } = useLocation();
  const { settings, ok } = useMemo(() => decode(hash), [hash]);
  // "Less motion" in the link works like ?rm=1 (main.tsx), before the first paint (T6.74); "Lite" stops only the
  // looping backgrounds (T6.119, index.css).
  useLayoutEffect(() => {
    if (settings.lessMotion) document.documentElement.dataset.rm = "";
    if (settings.liteMotion) document.documentElement.dataset.lite = "";
  }, [settings.lessMotion, settings.liteMotion]);
  // OBS fires this when the source's scene goes on air (program), so a scene loaded ahead of time still enters where
  // viewers see it. Only OBS fires it; elsewhere nothing changes. The countdown is fixed by the link, so it never resets.
  const [take, setTake] = useState(0);
  useEffect(() => {
    if (!replay) return;
    const onActive = (e: Event) => {
      if ((e as CustomEvent<{ active: boolean }>).detail?.active) setTake((t) => t + 1);
    };
    addEventListener("obsSourceActiveChanged", onActive);
    return () => removeEventListener("obsSourceActiveChanged", onActive);
  }, [replay]);
  // `?canvas=vertical` (Phase 10): the portrait layout, read once from the link like `?rm=1`.
  return (
    <CanvasContext.Provider value={linkCanvas(search)}>
      <Fragment key={take}>{children(settings, !ok && <OverlayError />)}</Fragment>
    </CanvasContext.Provider>
  );
}
