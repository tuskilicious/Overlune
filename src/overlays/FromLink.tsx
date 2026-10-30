import { Fragment, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { followLive } from "../lib/live";
import type { Settings } from "../settings/schema";
import { decode, liveId } from "../settings/url";
import { CanvasContext, linkCanvas } from "./measure";
import OverlayError from "./OverlayError";

/** Overlay route: reads settings from the link. A damaged link still renders (bad fields fall back) with the error card.
 *  A saved overlay's link (`live=<id>`, T12.4) shows its settings at once, then follows its live channel: each "Update
 *  OBS" replaces them in place. If the channel is out of reach or the overlay is gone, the last ones stay, with no error
 *  on stream. */
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
  const snapshot = useMemo(() => decode(hash), [hash]);
  const live = useMemo(() => liveId(search), [search]);
  const [published, setPublished] = useState<Settings | null>(null);
  useEffect(() => {
    if (!live) return;
    return followLive(
      live,
      (encoded) => {
        const update = decode(encoded);
        if (update.ok) setPublished(update.settings);
      },
      { origin: location.origin },
    );
  }, [live]);
  const settings = published ?? snapshot.settings;
  const ok = published !== null || snapshot.ok;
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
