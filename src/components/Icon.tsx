/** Small line icons in one stroke weight (T6.118), instead of text glyphs standing in for icons. Decorative: the
 *  words next to them carry the meaning. */
import "./icon.css";

const paths = {
  check: "M2 6.5 5 9.5 10 3",
  back: "M10 6H2.5M6 2.5 2.5 6 6 9.5",
  arrow: "M3.5 8.5 8.5 3.5M4.5 3.5h4v4",
  expand: "M7 2.5h2.5V5M5 9.5H2.5V7M9.5 2.5 6.5 5.5M2.5 9.5l3-3",
  // The editor's section list (T6.135).
  look: "M10.5 6a4.5 4.5 0 1 1-9 0 4.5 4.5 0 1 1 9 0M6 1.5v9",
  text: "M1.5 2.5h9v7h-9zM3.5 5h5M3.5 7h3",
  socials: "M8 4a2 2 0 1 1-4 0 2 2 0 1 1 4 0M2 10.5a4 4 0 0 1 8 0",
  chat: "M1.5 2.5h9v6H5.5L3 10.5v-2H1.5z",
  alerts: "M6 1.5a3 3 0 0 1 3 3V7l1 1.5H2L3 7V4.5a3 3 0 0 1 3-3M5 10.5h2",
  frame: "M1.5 2.5h9v7h-9zM7.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 1 1 3 0",
  channel: "M1.5 1.5h9v3h-9zM1.5 6.5h4v4h-4zM7.5 6.5h3v4h-3z",
  logo: "M1.5 1.5h9v9h-9zM3 8.5l2-2.5 1.5 1.5 1-1 1.5 2",
  motion: "M1.5 4.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0M1.5 8c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0",
  colors:
    "M7.5 4.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0M9.5 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0",
  links: "M5 7l2-2M4.5 5.5l-1 1a1.8 1.8 0 0 0 2.5 2.5l1-1M7.5 6.5l1-1A1.8 1.8 0 0 0 6 3L5 4",
  collapse: "M7 3 4 6l3 3M10 3 7 6l3 3",
  open: "M5 3l3 3-3 3M2 3l3 3-3 3",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 12 12" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
