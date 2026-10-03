import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router";
import type { Settings } from "../settings/schema";
import { decode } from "../settings/url";
import OverlayError from "./OverlayError";

/** Overlay route: reads settings from the link. A damaged link still renders (bad fields fall back) with the error card. */
export default function FromLink({
  children,
}: {
  children: (settings: Settings, error: ReactNode) => ReactNode;
}) {
  const { hash } = useLocation();
  const { settings, ok } = useMemo(() => decode(hash), [hash]);
  // "Less motion" in the link works like ?rm=1 (main.tsx), before the first paint (T6.74).
  useLayoutEffect(() => {
    if (settings.lessMotion) document.documentElement.dataset.rm = "";
  }, [settings.lessMotion]);
  return children(settings, !ok && <OverlayError />);
}
