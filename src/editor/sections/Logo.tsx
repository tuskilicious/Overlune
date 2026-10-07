import { useState } from "react";
import { isHttpsUrl } from "../../lib/url-safety";
import type { SectionProps } from "./fields";

/** The logo link. Its box keeps its own text in EditorPage, so a half-typed or unsafe link never reaches the
 *  preview, and undo and load can refill it. */
export default function Logo({
  settings,
  update,
  resetButton,
  logoInput,
  setLogoInput,
}: SectionProps & { logoInput: string; setLogoInput: (v: string) => void }) {
  /** The logo link is https: but no picture loaded from it (T6.21). */
  const [logoBroken, setLogoBroken] = useState(false);
  const logoOk = logoInput === "" || isHttpsUrl(logoInput);
  return (
    <fieldset id="part-logo" className="editor-part" tabIndex={-1}>
      <legend>Logo (optional)</legend>
      {resetButton("Logo", settings.logo !== "" || logoInput !== "", () => {
        update({ logo: "" });
        setLogoInput("");
      })}
      <label>
        Link to your logo image (starts with https://)
        <input
          type="url"
          value={logoInput}
          maxLength={2048}
          aria-invalid={!logoOk || logoBroken}
          aria-describedby="logo-hint logo-error"
          onChange={(e) => {
            const v = e.target.value.trim();
            setLogoInput(v);
            setLogoBroken(false);
            update({ logo: v === "" || isHttpsUrl(v) ? v : "" });
          }}
        />
      </label>
      <p id="logo-hint" className="editor-hint">
        Use a picture that’s already online, like your Twitch profile picture: right-click it,
        choose <strong>Copy image address</strong>, and paste it here.
      </p>
      {/* Streamers didn't know how to get an image link; uploads are out of scope for v1 (T6.73). */}
      <details className="editor-more">
        <summary>How to get a link to your logo</summary>
        <ol className="editor-steps-list">
          <li>
            Open your channel page on twitch.tv (or your YouTube or X profile) in your browser.
          </li>
          <li>
            Right-click your profile picture and choose <strong>Copy image address</strong> (in
            Firefox: <strong>Copy Image Link</strong>; on a Mac, Control-click).
          </li>
          <li>
            Paste it in the box above. It starts with <code>https://</code>, and your logo shows
            under the box when it works.
          </li>
        </ol>
        <p className="editor-hint">
          Any picture already online works the same way. Paste a link that opens just the picture,
          not a page with the picture on it: share links from Google Drive or Dropbox don’t work,
          and image links copied from Discord stop working after a day.
        </p>
      </details>
      {settings.logo && !logoBroken && (
        <img
          key={settings.logo}
          className="editor-logo-check"
          src={settings.logo}
          alt="Your logo"
          onError={() => setLogoBroken(true)}
        />
      )}
      <p id="logo-error" className="editor-error" role="alert">
        {!logoOk
          ? "This link must start with https://. Copy the image address again and paste it."
          : logoBroken
            ? "No picture loaded from this link. Check that it opens an image in your browser, not a web page."
            : ""}
      </p>
    </fieldset>
  );
}
