/**
 * Plays a theme sound from public/sounds at `volume` percent (0 plays nothing).
 * Uses an <audio> element so OBS can route it with "Control audio via OBS".
 * Never throws: a blocked or missing sound must not break the alert.
 */
export function playSound(file: string, volume: number): void {
  if (volume <= 0) return;
  try {
    const audio = new Audio(`/sounds/${encodeURIComponent(file)}`);
    audio.volume = Math.min(volume, 100) / 100;
    audio.play().catch(() => {
      // Autoplay blocked or file missing: stay silent.
    });
  } catch {
    // No audio support: stay silent.
  }
}
