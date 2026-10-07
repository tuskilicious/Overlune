/** Small line icons in one stroke weight (T6.118), instead of text glyphs standing in for icons. Decorative: the
 *  words next to them carry the meaning. */
const paths = {
  check: "M2 6.5 5 9.5 10 3",
  back: "M10 6H2.5M6 2.5 2.5 6 6 9.5",
} as const;

export default function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="icon" viewBox="0 0 12 12" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
