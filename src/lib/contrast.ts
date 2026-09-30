/** WCAG 2.x relative luminance for a #RRGGBB color. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #RRGGBB colors (1 to 21). AA body text needs 4.5. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const isHex = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

/** Mixes two #RRGGBB colors: t=0 is `a`, t=1 is `b`. */
function mix(a: string, b: string, t: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  const hex = (i: number) =>
    Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(1)}${hex(3)}${hex(5)}`;
}

/**
 * `color` if it reads at AA (4.5:1) on `surface`, otherwise the smallest step toward `text` that does.
 * Keeps a viewer's chosen name color recognizable while staying readable. Non-hex input returns `text`.
 */
export function readableOn(color: string, surface: string, text: string): string {
  if (!isHex(color) || !isHex(surface) || !isHex(text)) return text;
  if (contrast(color, surface) >= 4.5) return color;
  for (let t = 0.1; t < 1; t += 0.1) {
    const c = mix(color, text, t);
    if (contrast(c, surface) >= 4.5) return c;
  }
  return text;
}
