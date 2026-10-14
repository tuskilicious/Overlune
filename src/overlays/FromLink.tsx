import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router";
import type { Settings } from "../settings/schema";
import { decode } from "../settings/url";
import { CanvasContext, linkCanvas } from "./measure";
import OverlayError from "./OverlayError";

/** Overlay route: reads settings from the link. A damaged link still renders (bad fields fall back) with the error card. */
export default function FromLink({
  children,
}: {
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
  // `?canvas=vertical` (Phase 10): the portrait layout, read once from the link like `?rm=1`.
  return (
    <CanvasContext.Provider value={linkCanvas(search)}>
      {children(settings, !ok && <OverlayError />)}
    </CanvasContext.Provider>
  );
}
