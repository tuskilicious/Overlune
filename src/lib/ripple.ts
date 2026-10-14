/**
 * The site's button press (2.1, after ddoemonn's "Ripple Button" on 21st.dev, ported as one delegated listener): a ripple
 * spreads from where a button is pressed, or from its middle for Enter and Space. Site pages only, never overlays; not
 * the shimmer and glow buttons, which have their own; nothing with reduced motion.
 */
import "./ripple.css";

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.rm !== undefined;

function ripple(button: HTMLElement, x: number, y: number) {
  if (still() || button.closest(".btn-shimmer, .btn-glow, .canvas, .editor-preview")) return;
  if (getComputedStyle(button).position === "static") button.style.position = "relative";
  const r = button.getBoundingClientRect();
  const box = document.createElement("span");
  box.className = "ripple-box";
  box.setAttribute("aria-hidden", "true");
  const wave = document.createElement("span");
  wave.className = "ripple";
  // Big enough to reach the farthest corner from where it starts.
  const size = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x - size / 2}px;top:${y - size / 2}px`;
  box.append(wave);
  button.append(box);
  wave.addEventListener("animationend", () => box.remove(), { once: true });
}

export function installRipples() {
  document.addEventListener("pointerdown", (e) => {
    const button = (e.target as Element | null)?.closest?.("button");
    if (!button || button.disabled) return;
    const r = button.getBoundingClientRect();
    ripple(button, e.clientX - r.left, e.clientY - r.top);
  });
  document.addEventListener("keydown", (e) => {
    if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    const button = (e.target as Element | null)?.closest?.("button");
    if (!button || button.disabled) return;
    const r = button.getBoundingClientRect();
    ripple(button, r.width / 2, r.height / 2);
  });
}
