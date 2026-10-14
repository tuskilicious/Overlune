/** Small line icons in one stroke weight (T6.118), Overlune's own, instead of text glyphs standing in for icons. Each
 *  is drawn in parts, so it can move the way the thing it shows would when what it's in is pointed at (2.1, after
 *  Skiper UI's "Animated Icon Buttons" on 21st.dev: icon.css). Decorative: the words next to them carry the meaning. */
import "./icon.css";

/** Each icon's parts, in order: icon.css moves them by position (`.icon[data-icon] > :nth-child(n)`). A part that's
 *  only shown on hover starts hidden there. */
const parts = {
  check: ["M2 6.5 5 9.5 10 3"],
  // The front sheet, then the one behind it.
  copy: ["M4.5 4.5h6v6h-6z", "M7.5 4.5v-3h-6v6h3"],
  // Arrows: shaft, then head.
  back: ["M10 6H2.5", "M6 2.5 2.5 6 6 9.5"],
  next: ["M2 6h7.5", "M6 2.5 9.5 6 6 9.5"],
  arrow: ["M3.5 8.5 8.5 3.5M4.5 3.5h4v4"],
  // The top right corner, then the bottom left.
  expand: ["M7 2.5h2.5V5M9.5 2.5 6.5 5.5", "M5 9.5H2.5V7M2.5 9.5l3-3"],
  // The editor's section list (T6.135).
  // A disc and its dividing line.
  look: ["M10.5 6a4.5 4.5 0 1 1-9 0 4.5 4.5 0 1 1 9 0", "M6 1.5v9"],
  // The page, then its two lines of text.
  text: ["M1.5 2.5h9v7h-9z", "M3.5 5h5", "M3.5 7h3"],
  // Head, then shoulders.
  socials: ["M8 4a2 2 0 1 1-4 0 2 2 0 1 1 4 0", "M2 10.5a4 4 0 0 1 8 0"],
  // The bubble, then three typing dots that show on hover.
  chat: ["M1.5 2.5h9v6H5.5L3 10.5v-2H1.5z", "M4 5.5h0", "M6 5.5h0", "M8 5.5h0"],
  // The bell, then its clapper.
  alerts: ["M6 1.5a3 3 0 0 1 3 3V7l1 1.5H2L3 7V4.5a3 3 0 0 1 3-3", "M5 10.5h2"],
  // The frame, then the lens.
  frame: ["M1.5 2.5h9v7h-9z", "M7.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 1 1 3 0"],
  // Three panels.
  channel: ["M1.5 1.5h9v3h-9z", "M1.5 6.5h4v4h-4z", "M7.5 6.5h3v4h-3z"],
  // The picture's frame, then its hills.
  logo: ["M1.5 1.5h9v9h-9z", "M3 8.5l2-2.5 1.5 1.5 1-1 1.5 2"],
  // Two waves.
  motion: ["M1.5 4.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0", "M1.5 8c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0"],
  // Two swatches.
  colors: [
    "M7.5 4.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0",
    "M9.5 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0",
  ],
  // The link's middle, then its two halves.
  links: [
    "M5 7l2-2",
    "M4.5 5.5l-1 1a1.8 1.8 0 0 0 2.5 2.5l1-1",
    "M7.5 6.5l1-1A1.8 1.8 0 0 0 6 3L5 4",
  ],
  // Two chevrons each.
  collapse: ["M7 3 4 6l3 3", "M10 3 7 6l3 3"],
  open: ["M5 3l3 3-3 3", "M2 3l3 3-3 3"],
} as const;

export type IconName = keyof typeof parts;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" data-icon={name} viewBox="0 0 12 12" aria-hidden="true">
      {parts[name].map((d) => (
        <path key={d} d={d} pathLength={1} />
      ))}
    </svg>
  );
}
