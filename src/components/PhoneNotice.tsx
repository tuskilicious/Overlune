import { useState } from "react";
import "./phone-notice.css";

const KEY = "overlune-phone-notice";
/** A phone: a narrow screen you touch. Tablets and small laptop windows don't count. */
const PHONE = "(max-width: 767px) and (pointer: coarse)";

/**
 * On a phone (2.1, the owner): Overlune is made on a computer, where OBS runs, so say so, and offer to send the link
 * there. The Android app (Phase 14) will control OBS from the phone; until it's out, the card says it's coming.
 * Closed once, it stays closed in this browser.
 */
export default function PhoneNotice() {
  const [open, setOpen] = useState(() => {
    try {
      if (localStorage.getItem(KEY) === "closed") return false;
    } catch {
      // No storage (a private window): show it each visit.
    }
    return matchMedia(PHONE).matches;
  });
  const [sent, setSent] = useState<string | null>(null);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "closed");
    } catch {
      // Closed for this visit.
    }
  };
  // The editor link, without anything after the # (a save stays on this phone unless they share it themselves).
  const link = `${location.origin}/editor`;
  const send = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Overlune", text: "Make my stream overlays", url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setSent("Link copied. Paste it into a message to yourself.");
    } catch {
      // Share sheet closed, or copying blocked: show the link to type instead.
      setSent(`Open ${link.replace(/^https?:\/\//, "")} on your computer.`);
    }
  };
  return (
    <aside className="phone-notice" aria-labelledby="phone-notice-title">
      <p id="phone-notice-title" className="phone-notice-title">
        Overlune is made for your computer
      </p>
      <p>
        Your overlays go into OBS on your PC, and the editor needs a big screen. Open Overlune on
        your computer to make them.
      </p>
      <p className="phone-notice-app">
        The Overlune app for Android is coming soon, to run your stream from your phone.
      </p>
      <div className="phone-notice-actions">
        <button type="button" onClick={send}>
          Send me the link
        </button>
        <button type="button" onClick={close}>
          Got it
        </button>
      </div>
      {sent && (
        <p className="phone-notice-sent" role="status">
          {sent}
        </p>
      )}
    </aside>
  );
}
