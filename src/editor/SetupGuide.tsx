import { Link } from "react-router";
import SiteFooter from "../components/SiteFooter";
import { defaultSettings } from "../settings/schema";
import { brandChrome } from "./brand";
import "../themes/fonts";
import { themeVars } from "../themes/vars";
import { overlays } from "./ObsLinks";
import "./editor.css";
import "./guide.css";

/** A screenshot from public/images/guide (not public/guide, which would shadow the /guide page on some hosts): the owner's own OBS captures (docs/ASSETS.md). */
function Shot({ file, alt, caption }: { file: string; alt: string; caption?: string }) {
  return (
    <figure className="guide-shot">
      <img src={`/images/guide/${file}`} alt={alt} loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Step-by-step OBS and Streamlabs setup for beginners, at /guide. */
export default function SetupGuide() {
  const sizes = [
    ...Object.values(overlays).map((o) => ({ ...o, note: "" })),
    {
      name: "Chat",
      width: defaultSettings.chat.width,
      height: defaultSettings.chat.height,
      note: "or the size you picked in the editor",
    },
    { name: "Alerts", width: 1920, height: 1080, note: "" },
  ];
  return (
    <div className="editor guide" style={themeVars(brandChrome)}>
      <header className="editor-header">
        <Link to="/" className="guide-logo">
          <img src="/images/brand/logo.png" alt="Overlune home" width="159" height="48" />
        </Link>
        <p>
          <Link to="/editor">← Back to the editor</Link>
        </p>
        <h1>Set up your overlays in OBS</h1>
        <p>About 5 minutes. You only do this once. After that, your overlays update themselves.</p>
      </header>

      <main>
        <section className="guide-step" aria-labelledby="add-heading">
          <h2 id="add-heading">1. Add an overlay</h2>
          <ol>
            <li>
              In the editor, press <strong>Copy link</strong> next to the overlay you want.
            </li>
            <li>
              In OBS, find the <strong>Sources</strong> box at the bottom. Press <strong>+</strong>.
              In the list on the left, choose <strong>Browser</strong>. Give it a name, like
              “Starting Soon”, and press <strong>OK</strong>.
            </li>
            <li>
              Delete what is in the <strong>URL</strong> box and paste your link.
            </li>
            <li>
              Type the <strong>Width</strong> and <strong>Height</strong> from the table below, then
              press <strong>OK</strong>.
            </li>
          </ol>
          <Shot
            file="obs-add-browser.png"
            alt="The OBS Add Source window, with Browser in the list on the left."
          />
          <table className="guide-sizes">
            <caption>Sizes to type in</caption>
            <thead>
              <tr>
                <th scope="col">Overlay</th>
                <th scope="col">Width</th>
                <th scope="col">Height</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{s.width}</td>
                  <td>
                    {s.height}
                    {s.note && <span className="guide-note"> ({s.note})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Every link carries your settings, so you only paste it once.</p>
        </section>

        <section className="guide-step" aria-labelledby="settings-heading">
          <h2 id="settings-heading">2. Tick the right boxes</h2>
          <p>In the same window, below the size:</p>
          <ul>
            <li>
              <strong>Control audio via OBS:</strong> turn it <strong>on</strong> for Alerts, so
              your viewers hear the alert sound.
            </li>
            <li>
              <strong>Shutdown source when not visible:</strong> leave it <strong>off</strong> for
              Chat and Alerts, so they stay connected when you switch scenes.
            </li>
            <li>Leave the “Custom CSS” box as it is. It keeps the background see-through.</li>
          </ul>
          <Shot
            file="obs-properties.png"
            alt="OBS Browser source properties with the link, width 1920, height 1080 and Control audio via OBS ticked."
          />
        </section>

        <section className="guide-step" aria-labelledby="audio-heading">
          <h2 id="audio-heading">3. Make sure alerts can be heard</h2>
          <ol>
            <li>
              With “Control audio via OBS” on, your Alerts source shows up in the{" "}
              <strong>Audio Mixer</strong>. Check that it is not muted and its slider is up.
            </li>
            <li>
              Want to hear alerts in your own headphones too? In the Audio Mixer, press the{" "}
              <strong>⋮</strong> or gear button, choose <strong>Advanced Audio Properties</strong>,
              and set Alerts to <strong>Monitor and Output</strong>.
            </li>
            <li>
              Test it: in the editor, copy the <strong>Link to test your alerts in OBS</strong>,
              paste it into your Alerts source, then switch back to the normal link when you are
              done.
            </li>
          </ol>
          <Shot
            file="obs-audio-mixer.png"
            alt="The OBS Audio Mixer showing the Alerts source with its volume slider."
          />
        </section>

        <section aria-labelledby="black-heading">
          <h2 id="black-heading">Fix: a black or white box</h2>
          <ul>
            <li>
              <strong>Check the link.</strong> Copy it again from the editor and paste it. If a link
              was cut short, the overlay shows a message saying what is wrong.
            </li>
            <li>
              <strong>Refresh it.</strong> Right-click the source, choose{" "}
              <strong>Properties</strong>, and press <strong>Refresh cache of current page</strong>.
            </li>
            <li>
              <strong>Custom CSS.</strong> If you changed the “Custom CSS” box, press{" "}
              <strong>Defaults</strong> at the bottom of the window to bring it back.
            </li>
            <li>
              <strong>Still black?</strong> In OBS, go to <strong>Settings → Advanced</strong> and
              switch <strong>Browser Source Hardware Acceleration</strong> off (or on, if it was
              off), then restart OBS.
            </li>
          </ul>
          <Shot
            file="obs-refresh.png"
            alt="OBS Browser source properties with the Refresh cache of current page button."
            caption="This example is a Be Right Back scene. For Chat and Alerts, leave “Shutdown source when not visible” unticked."
          />
        </section>

        <section aria-labelledby="chat-heading">
          <h2 id="chat-heading">Fix: chat is empty</h2>
          <ul>
            <li>
              <strong>Nothing has been said yet.</strong> The chat box only shows new messages, and
              it is see-through when empty. Type something in your own Twitch chat to test it.
            </li>
            <li>
              <strong>Check your channel name.</strong> If it is missing or wrong, the chat box
              shows a message saying so. Fix the name under Chat in the editor, then copy a fresh
              Chat link into OBS.
            </li>
            <li>
              <strong>Refresh it.</strong> Open the source’s <strong>Properties</strong> and press{" "}
              <strong>Refresh cache of current page</strong>.
            </li>
          </ul>
        </section>

        {/* Two more fixes streamers asked for (T6.72). */}
        <section aria-labelledby="silent-heading">
          <h2 id="silent-heading">Fix: alerts are silent or don’t show</h2>
          <ul>
            <li>
              <strong>Control audio via OBS.</strong> Open the Alerts source’s{" "}
              <strong>Properties</strong> and tick it. Without it, OBS doesn’t pick up the sound.
            </li>
            <li>
              <strong>Check the Audio Mixer.</strong> The Alerts source must not be muted, and its
              slider should be up (step 3 above).
            </li>
            <li>
              <strong>Check the volume.</strong> In the editor, under Alerts, 0% turns the sound
              off. After changing it, copy a fresh Alerts link into OBS.
            </li>
            <li>
              <strong>Test it.</strong> Paste the editor’s{" "}
              <strong>Link to test your alerts in OBS</strong> into your Alerts source, then switch
              back to the normal link.
            </li>
            <li>
              <strong>No alert at all?</strong> Alerts use your channel name from Chat in the
              editor, and they are for raids, subs, gift subs and bits. Follow alerts need a Twitch
              login, so they come in a later version.
            </li>
          </ul>
        </section>

        <section aria-labelledby="size-heading">
          <h2 id="size-heading">Fix: the overlay is the wrong size or cut off</h2>
          <ul>
            <li>
              <strong>Check the size.</strong> In the source’s <strong>Properties</strong>, Width
              and Height must match the sizes in the table above: 1920 and 1080 for the scenes and
              Alerts, and the size you picked for Chat.
            </li>
            <li>
              <strong>Fit it to the screen.</strong> For a scene or Alerts, right-click the source
              and choose <strong>Transform → Fit to screen</strong>.
            </li>
            <li>
              <strong>Check your canvas.</strong> In OBS, go to <strong>Settings → Video</strong>.
              If <strong>Base (Canvas) Resolution</strong> isn’t 1920x1080, Fit to screen still
              makes the scenes fill it.
            </li>
            <li>
              <strong>Chat cut off?</strong> Change the chat box size under Chat in the editor, copy
              a fresh Chat link, and type the same width and height in OBS.
            </li>
          </ul>
        </section>

        <section aria-labelledby="streamlabs-heading">
          <h2 id="streamlabs-heading">Using Streamlabs Desktop?</h2>
          <p>It works the same way, with slightly different names:</p>
          <ol>
            <li>
              In the <strong>Sources</strong> box, press <strong>+</strong>, choose{" "}
              <strong>Browser Source</strong>, and press <strong>Add Source</strong>.
            </li>
            <li>
              Paste your link into <strong>URL</strong>, and type the width and height from the
              table above.
            </li>
            <li>
              For Alerts, turn on <strong>Control audio via OBS</strong> in the same window, just
              like in OBS.
            </li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
