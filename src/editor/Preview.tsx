import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Shows an overlay (1920×1080 unless sized) scaled down to the width it's given. */
export default function Preview({
  width = 1920,
  height = 1080,
  children,
}: {
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    // The preview only repeats the form visually, so screen readers and Tab skip it (no second h1, no duplicate text).
    <div
      className="editor-preview"
      ref={ref}
      style={{ "--scale": scale, aspectRatio: `${width} / ${height}` } as CSSProperties}
      aria-hidden
      inert
    >
      {children}
    </div>
  );
}
