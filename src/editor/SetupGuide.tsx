import { useState, type ReactNode } from "react";
import { useHeadingAbove } from "../lib/useHeadingAbove";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { defaultSettings } from "../settings/schema";
import { brandChrome } from "./brand";
import "../themes/fonts";
import { themeVars } from "../themes/vars";
import { overlays } from "./ObsLinks";
import { canvasKeys } from "./canvas/Panels";
import "./editor.css";
import "./guide.css";
import Icon from "../components/Icon";

/** A screenshot from public/images/guide (not public/guide, which would shadow the /guide page on some hosts): the owner's own OBS captures (docs/ASSETS.md). */
function Shot({ file, alt, caption }: { file: string; alt: string; caption?: string }) {
  return (
    <figure className="guide-shot">
      <img src={`/images/guide/${file}`} alt={alt} loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/**
 * One of the three setup steps on a numbered rail (T6.153), after 21st.dev's "Vertical Titled Stepper" (behavior
 * only): a dot per step on a line, a tick once you mark it done, and the line filled down to the next step. The
 * first step not done yet is the current one. The number stays in the heading for screen readers.
 */
function Step({
  n,
  id,
  title,
  done,
  current,
  onDone,
  children,
}: {
  n: number;
  id: string;
  title: string;
  done: boolean;
  current: boolean;
  onDone: () => void;
  children: ReactNode;
}) {
  return (
    <li
      className="guide-rail-item"
      data-done={done || undefined}
      data-current={current || undefined}
    >
      <span aria-hidden className="guide-rail-dot">
        {done ? <Icon name="check" /> : n}
      </span>
      <section className="guide-step" aria-labelledby={id}>
        <h2 id={id}>
          <span className="sr-only">{n}. </span>
          {title}
        </h2>
        {children}
        <button type="button" className="guide-step-done" aria-pressed={done} onClick={onDone}>
          {done && <Icon name="check" />} Done with this step
        </button>
      </section>
    </li>
  );
}

/**
 * A fix that opens in place (T6.153), after 21st.dev's spring "Accordion" (behavior only): a native details, so it
 * works by keyboard and find-in-page opens it, with its heading always showing and a springy height on open. Several
 * can be open at once.
 */
function Fix({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <details className="guide-fix">
      <summary>
        <h2 id={id}>{title}</h2>
        <span aria-hidden className="guide-fix-chevron" />
      </summary>
      <div className="guide-fix-body">{children}</div>
    </details>
  );
}

/** Step-by-step OBS and Streamlabs setup for beginners, at /guide. */
/** The guide's index (T6.118): heading id and a short name. */
const guideIndex = [
  ["add-heading", "1. Add an overlay"],
  ["settings-heading", "2. Tick the boxes"],
  ["audio-heading", "3. Alert sound"],
  ["import-heading", "Import every scene"],
  ["rehearse-heading", "Before your first stream"],
  ["customize-heading", "Move things around"],
  ["black-heading", "Fixes"],
  ["streamlabs-heading", "Streamlabs"],
] as const;
const guideIds = guideIndex.map(([id]) => id);

export default function SetupGuide() {
  const reading = useHeadingAbove(guideIds);
  const [done, setDone] = useState([false, false, false]);
  const current = done.indexOf(false);
  const toggle = (i: number) => () => setDone((d) => d.map((v, j) => (j === i ? !v : v)));
  const sizes = [
    ...Object.values(overlays).map((o) => ({ ...o, note: "" })),
    {
      name: "Chat",
      width: defaultSettings.chat.width,
      height: defaultSettings.chat.height,
      note: "or the size you picked in the editor",
    },
    { name: "Alerts", width: 1920, height: 1080, note: "" },
    {
      name: "Webcam frame",
      width: defaultSettings.frame.width,
      height: defaultSettings.frame.height,
      note: "optional; or the size you picked. Put it above your camera and line them up",
    },
    {
      name: "Live",
      width: 1920,
      height: 1080,
      note: "optional: chat, alerts and the webcam frame in one source, instead of those three",
    },
  ];
  return (
    <div className="editor guide site-sky" style={themeVars(brandChrome)}>
      <SiteNav />
      {/* Centred under the nav (T8.2): on wide windows the index is a sticky column beside the steps and marks the
          part you're reading; narrower, it's the row of chips under the heading. */}
      <div className="guide-layout">
        <header className="editor-header">
          <h1>Set up your overlays in OBS</h1>
          <p>You only do this once. After that, your overlays update themselves.</p>
        </header>
        {/* Every part one tap away, like the kits' guides (T6.118). */}
        <nav className="guide-index" aria-label="On this page">
          <ol>
            {guideIndex.map(([id, name]) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={reading === id ? "location" : undefined}>
                  {name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          {/* The three setup steps on a rail (T6.153). */}
          <ol className="guide-rail">
            <Step
              n={1}
              id="add-heading"
              title="Add an overlay"
              done={done[0]!}
              current={current === 0}
              onDone={toggle(0)}
            >
              <ol>
                <li>
                  In the editor, press <strong>Copy link</strong> next to the overlay you want.
                </li>
                <li>
                  In OBS, find the <strong>Sources</strong> box at the bottom. Press{" "}
                  <strong>+</strong>. In the list on the left, choose <strong>Browser</strong>, then
                  press <strong>Add a new Browser</strong> at the top. Give it a name, like
                  “Starting Soon”, and press <strong>OK</strong>.
                </li>
                <li>
                  Delete what is in the <strong>URL</strong> box and paste your link.
                </li>
                <li>
                  Type the <strong>Width</strong> and <strong>Height</strong> from the table below,
                  then press <strong>OK</strong>.
                </li>
              </ol>
              <Shot
                file="obs-add-browser.png"
                alt="The OBS Add Source window, with Browser chosen in the list on the left and Add a new Browser at the top."
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
              <p>
                Picked another canvas size in the editor? Then the scenes and Live take that size
                instead of 1920 × 1080. Every link carries your settings, so you only paste it once.
              </p>
            </Step>

            <Step
              n={2}
              id="settings-heading"
              title="Tick the right boxes"
              done={done[1]!}
              current={current === 1}
              onDone={toggle(1)}
            >
              <p>In the same window, below the size:</p>
              <ul>
                <li>
                  <strong>Control audio via OBS:</strong> turn it <strong>on</strong> for Alerts, so
                  your viewers hear the alert sound.
                </li>
                <li>
                  <strong>Shutdown source when not visible:</strong> leave it <strong>off</strong>{" "}
                  for Chat and Alerts, so they stay connected when you switch scenes.
                </li>
                <li>Leave the “Custom CSS” box as it is. It keeps the background see-through.</li>
              </ul>
              <Shot
                file="obs-properties.png"
                alt="OBS Browser source properties with the link, width 1920, height 1080 and Control audio via OBS ticked."
              />
            </Step>

            <Step
              n={3}
              id="audio-heading"
              title="Make sure alerts can be heard"
              done={done[2]!}
              current={current === 2}
              onDone={toggle(2)}
            >
              <ol>
                <li>
                  With “Control audio via OBS” on, your Alerts source shows up in the{" "}
                  <strong>Audio Mixer</strong>. Check that it is not muted and its slider is up.
                </li>
                <li>
                  Want to hear alerts in your own headphones too? In the Audio Mixer, press the{" "}
                  <strong>⋮</strong> or gear button, choose{" "}
                  <strong>Advanced Audio Properties</strong>, and set Alerts to{" "}
                  <strong>Monitor and Output</strong>.
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
            </Step>
          </ol>

          <section aria-labelledby="import-heading">
            <h2 id="import-heading">Faster: import every scene at once (OBS Studio)</h2>
            <p>
              Instead of adding each link by hand, press{" "}
              <strong>Download OBS scene collection</strong> in the editor’s links section. Then in
              OBS, open the <strong>Scene Collection</strong> menu, choose <strong>Import</strong>,
              pick the file and press <strong>Import</strong>, and switch to the{" "}
              <strong>Overlune</strong> collection. Every scene arrives with your links and sizes,
              and Alerts already has Control audio via OBS ticked. Add your game and camera to{" "}
              <strong>Overlune: Live</strong>. Streamlabs can’t import it: use the steps above.
            </p>
          </section>

          <section aria-labelledby="rehearse-heading">
            <h2 id="rehearse-heading">Before your first stream</h2>
            <p>A five-minute run-through, so nothing surprises you live:</p>
            <ul className="guide-checklist">
              <li>Switch to each scene in OBS once and check it fills the screen.</li>
              <li>Check the countdown shows the right time and time zone.</li>
              <li>Ask a friend to type in your chat, and check it shows in the Chat overlay.</li>
              <li>
                Paste the <strong>Link to test your alerts</strong> into your Alerts source, and
                check you see and hear every alert.
              </li>
              <li>Switch the Alerts source back to your normal Alerts link.</li>
              <li>Bookmark the editor page: your link is your save file.</li>
            </ul>
          </section>

          {/* Customizing (T9.9): optional, after the setup, for streamers who want their own layout. */}
          <section aria-labelledby="customize-heading">
            <h2 id="customize-heading">Make it yours: move things around</h2>
            <p>
              Every look is ready as it is, so this part is optional. To change where things sit,
              press <strong>Customize</strong> above the preview in the editor.
            </p>
            <ul>
              <li>
                <strong>Move, resize and turn.</strong> Drag a part to move it, drag a corner to
                resize it, and drag the round handle above it to turn it. Parts line up with the
                edges, the middle and each other.
              </li>
              <li>
                <strong>Layers</strong> lists every part. Hide, lock or reorder them, and add your
                own text, shapes and pictures (picture links start with https://).
              </li>
              <li>
                <strong>Inspector</strong> sets the picked part’s exact place, size, turn,
                see-through and colors.
              </li>
              <li>
                Each scene keeps its own layout. Press <strong>Live source</strong> to lay out chat,
                alerts and the webcam frame in one source.
              </li>
              <li>
                Is your OBS canvas not 1920×1080? Pick its size next to the preview’s name, and
                everything moves over with it.
              </li>
              <li>
                <strong>Reset to the look</strong> puts the scene back the way the look has it.
              </li>
              <li>
                <strong>Then copy that scene’s link again</strong> and paste it into OBS: the link
                holds your layout.
              </li>
            </ul>
            <table className="guide-sizes">
              <caption>Keyboard keys on the canvas</caption>
              <thead>
                <tr>
                  <th scope="col">Keys</th>
                  <th scope="col">What they do</th>
                </tr>
              </thead>
              <tbody>
                {canvasKeys.map(([keys, does]) => (
                  <tr key={keys}>
                    <th scope="row">{keys}</th>
                    <td>{does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Fix id="black-heading" title="Fix: a black or white box">
            <ul>
              <li>
                <strong>Check the link.</strong> Copy it again from the editor and paste it. If a
                link was cut short, the overlay shows a message saying what is wrong.
              </li>
              <li>
                <strong>Refresh it.</strong> Right-click the source, choose{" "}
                <strong>Properties</strong>, and press{" "}
                <strong>Refresh cache of current page</strong>.
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
          </Fix>

          <Fix id="chat-heading" title="Fix: chat is empty">
            <ul>
              <li>
                <strong>Nothing has been said yet.</strong> The chat box only shows new messages,
                and it is see-through when empty. Type something in your own Twitch chat to test it.
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
          </Fix>

          {/* Two more fixes streamers asked for (T6.72). */}
          <Fix id="silent-heading" title="Fix: alerts are silent or don’t show">
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
                <strong>Link to test your alerts in OBS</strong> into your Alerts source, then
                switch back to the normal link.
              </li>
              <li>
                <strong>No alert at all?</strong> Alerts use your channel name from Chat in the
                editor, and they are for raids, subs, gift subs and bits. Follow alerts need a
                Twitch login, so they come in a later version.
              </li>
            </ul>
          </Fix>

          <Fix id="size-heading" title="Fix: the overlay is the wrong size or cut off">
            <ul>
              <li>
                <strong>Check the size.</strong> In the source’s <strong>Properties</strong>, Width
                and Height must match the sizes in the table above: 1920 and 1080 for the scenes and
                Alerts (or the canvas size you picked for the scenes), and the size you picked for
                Chat and the Webcam frame.
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
                <strong>Chat cut off?</strong> Change the chat box size under Chat in the editor,
                copy a fresh Chat link, and type the same width and height in OBS.
              </li>
            </ul>
          </Fix>

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
      </div>
      <SiteFooter />
    </div>
  );
}
